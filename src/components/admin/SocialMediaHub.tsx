import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cachedFetch, invalidateNamespace } from "@/lib/supabaseCache";
import SocialAITools from "./SocialAITools";
import LiveDMConversations from "./LiveDMConversations";
import IGAutomationSuite from "./social/IGAutomationSuite";
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

const SocialMediaHub = () => {
  const [activeSubTab, setActiveSubTab] = useState("dashboard");
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

   // Navigate to connect tab and pulse the session card
   const navigateToSessionCard = () => {
     setActiveSubTab("connect");
     setIgSessionPulse(true);
     setTimeout(() => {
       const el = document.getElementById("ig-session-section");
       if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
     }, 200);
     setTimeout(() => setIgSessionPulse(false), 3000);
   };

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
    const data = await cachedFetch("global", "smh_accounts", async () => {
      const { data } = await supabase.from("managed_accounts").select("id, username, display_name, avatar_url").order("created_at", { ascending: false });
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
    }, { onConflict: "account_id,platform" });
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
    
    const { error } = await supabase.from("social_connections").delete().eq("id", id);
    if (error) { toast.error("Failed to disconnect: " + error.message); return; }
    
    // Immediately remove from local state for instant UI update
    setConnections(prev => prev.filter(c => c.id !== id));
    
    // Clear local profile state
    if (platform === "instagram") setIgProfile(null);
    if (platform === "tiktok") setTtProfile(null);
    
    // Invalidate cache so next loadData fetches fresh from DB
    if (selectedAccount) {
      invalidateNamespace(selectedAccount, "social_connections");
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
                avatar_url: profileData.profile_picture_url || null, subscriber_count: profileData.followers_count || 0, content_count: profileData.media_count || 0,
              }).select("id").single();
              if (err || !newAcct) { toast.error(err?.message || "Failed to create account"); setAutoConnectLoading(null); return; }
              accountId = newAcct.id; setSelectedAccount(accountId);
            }
            await supabase.from("social_connections").upsert({
              account_id: accountId, platform: "instagram", platform_user_id: userId, platform_username: username, access_token: token, is_connected: true, scopes: [],
              metadata: { profile_picture_url: profileData.profile_picture_url, name: profileData.name, followers_count: profileData.followers_count, media_count: profileData.media_count, connected_via: "automated_oauth" },
            }, { onConflict: "account_id,platform" });
            await supabase.from("managed_accounts").update({
              avatar_url: profileData.profile_picture_url || undefined, display_name: profileData.name || username,
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
     const scopes = "user.info.basic,user.info.profile,user.info.stats,video.list,video.publish,video.upload";
     const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${ttClientKey}&scope=${scopes}&response_type=code&redirect_uri=${encodeURIComponent(oauthRedirectUri)}&state=${csrfState}`;
     const authWindow = window.open(authUrl, "tiktok_oauth", "width=600,height=700,scrollbars=yes");
     setAutoConnectLoading("tiktok");
     toast.info("Authenticate with TikTok in the popup...");

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
           const { data, error } = await supabase.functions.invoke("tiktok-api", {
             body: { action: "exchange_code", params: { code, client_key: ttClientKey, client_secret: ttClientSecret, redirect_uri: oauthRedirectUri } },
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
               username, display_name: ttUser.display_name || username, platform: "tiktok", status: "active", avatar_url: ttUser.avatar_url || null,
             }).select("id").single();
             if (err || !newAcct) { toast.error(err?.message || "Failed to create account"); setAutoConnectLoading(null); return; }
             accountId = newAcct.id; setSelectedAccount(accountId);
           }
           await supabase.from("social_connections").upsert({
             account_id: accountId, platform: "tiktok", platform_user_id: openId || "", platform_username: username, access_token: accessToken,
             refresh_token: tokenData?.refresh_token || null, is_connected: true, scopes: [],
             metadata: { avatar_url: ttUser.avatar_url, display_name: ttUser.display_name, connected_via: "automated_oauth" },
           }, { onConflict: "account_id,platform" });
           await supabase.from("managed_accounts").update({
             avatar_url: ttUser.avatar_url || undefined, display_name: ttUser.display_name || username, last_activity_at: new Date().toISOString(),
           }).eq("id", accountId);
           setTtProfile(ttUser); await loadAccounts(); await loadData(accountId);
           toast.success(`✅ @${username} TikTok connected automatically!`);
           setAutoConnectLoading(null);
         }
       } catch { /* cross-origin polling */ }
     }, 500);
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
               username, display_name: xUser.name || username, platform: "twitter", status: "active", avatar_url: xUser.profile_image_url || null,
             }).select("id").single();
             if (err || !newAcct) { toast.error(err?.message || "Failed to create account"); setAutoConnectLoading(null); return; }
             accountId = newAcct.id; setSelectedAccount(accountId);
           }
           await supabase.from("social_connections").upsert({
             account_id: accountId, platform: "twitter", platform_user_id: xUser.id || "", platform_username: username, access_token: accessToken,
             refresh_token: tokenData?.refresh_token || null, is_connected: true, scopes: [],
             metadata: { profile_image_url: xUser.profile_image_url, name: xUser.name, public_metrics: xUser.public_metrics, connected_via: "automated_oauth" },
           }, { onConflict: "account_id,platform" });
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
               username, display_name: username, platform: "reddit", status: "active", avatar_url: redditUser.icon_img || null,
             }).select("id").single();
             if (err || !newAcct) { toast.error(err?.message || "Failed to create account"); setAutoConnectLoading(null); return; }
             accountId = newAcct.id; setSelectedAccount(accountId);
           }
           await supabase.from("social_connections").upsert({
             account_id: accountId, platform: "reddit", platform_user_id: redditUser.id || "", platform_username: username, access_token: accessToken,
             refresh_token: tokenData?.refresh_token || null, is_connected: true, scopes: [],
             metadata: { icon_img: redditUser.icon_img, link_karma: redditUser.link_karma, comment_karma: redditUser.comment_karma, connected_via: "automated_oauth" },
           }, { onConflict: "account_id,platform" });
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
           username, display_name: botInfo.first_name || username, platform: "telegram", status: "active",
         }).select("id").single();
         if (err || !newAcct) { toast.error(err?.message || "Failed to create account"); setAutoConnectLoading(null); return; }
         accountId = newAcct.id; setSelectedAccount(accountId);
       }
       await supabase.from("social_connections").upsert({
         account_id: accountId, platform: "telegram", platform_user_id: String(botInfo.id), platform_username: username, access_token: telegramBotToken,
         is_connected: true, scopes: [],
         metadata: { first_name: botInfo.first_name, is_bot: botInfo.is_bot, can_join_groups: botInfo.can_join_groups, connected_via: "automated_bot_token" },
       }, { onConflict: "account_id,platform" });
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
             const { data: newAcct, error: err } = await supabase.from("managed_accounts").insert({ username: "snapchat_user", display_name: "Snapchat", platform: "snapchat", status: "active" }).select("id").single();
             if (err || !newAcct) { toast.error(err?.message || "Failed"); setAutoConnectLoading(null); return; }
             accountId = newAcct.id; setSelectedAccount(accountId);
           }
           await supabase.from("social_connections").upsert({ account_id: accountId, platform: "snapchat", platform_user_id: "", platform_username: "snapchat_user", access_token: accessToken, refresh_token: data.data?.refresh_token || null, is_connected: true, scopes: [], metadata: { connected_via: "automated_oauth" } }, { onConflict: "account_id,platform" });
           await loadAccounts(); await loadData(accountId);
           toast.success("✅ Snapchat connected!");
           setAutoConnectLoading(null);
         }
       } catch { /* cross-origin */ }
     }, 500);
   };

   // ===== AUTOMATED THREADS CONNECT =====
   const automatedThreadsConnect = () => {
     if (!threadsAppId) { toast.error("Enter your Threads App ID first"); return; }
     const scopes = "threads_basic,threads_content_publish,threads_manage_insights,threads_manage_replies,threads_read_replies";
     const authUrl = `https://threads.net/oauth/authorize?client_id=${threadsAppId}&redirect_uri=${encodeURIComponent(oauthRedirectUri)}&scope=${scopes}&response_type=code`;
     const authWindow = window.open(authUrl, "threads_oauth", "width=600,height=700,scrollbars=yes");
     setAutoConnectLoading("threads");
     toast.info("Authenticate with Threads...");
     const interval = setInterval(async () => {
       try {
         if (!authWindow || authWindow.closed) { clearInterval(interval); setAutoConnectLoading(null); return; }
         const url = authWindow.location.href;
         if (url.includes("code=")) {
           const urlParams = new URL(url).searchParams;
           const code = urlParams.get("code");
           authWindow.close(); clearInterval(interval);
           if (!code) { setAutoConnectLoading(null); toast.error("No auth code"); return; }
           const { data, error } = await supabase.functions.invoke("threads-api", { body: { action: "exchange_code", params: { code, client_id: threadsAppId, client_secret: threadsAppSecret, redirect_uri: oauthRedirectUri } } });
           if (error || !data?.success) { toast.error(data?.error || error?.message || "Failed"); setAutoConnectLoading(null); return; }
           const accessToken = data.data?.access_token;
           if (!accessToken) { toast.error("No token"); setAutoConnectLoading(null); return; }
           const profileRes = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url&access_token=${accessToken}`);
           const profile = await profileRes.json();
           const username = profile.username || "threads_user";
           let accountId = selectedAccount;
           if (!accountId) {
             const { data: newAcct, error: err } = await supabase.from("managed_accounts").insert({ username, display_name: profile.name || username, platform: "threads", status: "active", avatar_url: profile.threads_profile_picture_url || null }).select("id").single();
             if (err || !newAcct) { toast.error(err?.message || "Failed"); setAutoConnectLoading(null); return; }
             accountId = newAcct.id; setSelectedAccount(accountId);
           }
           await supabase.from("social_connections").upsert({ account_id: accountId, platform: "threads", platform_user_id: profile.id || "", platform_username: username, access_token: accessToken, is_connected: true, scopes: [], metadata: { name: profile.name, threads_profile_picture_url: profile.threads_profile_picture_url, connected_via: "automated_oauth" } }, { onConflict: "account_id,platform" });
           await loadAccounts(); await loadData(accountId);
           toast.success(`✅ @${username} Threads connected!`);
           setAutoConnectLoading(null);
         }
       } catch { /* cross-origin */ }
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
         const { data: newAcct, error: err } = await supabase.from("managed_accounts").insert({ username, display_name: profile.verified_name || username, platform: "whatsapp", status: "active" }).select("id").single();
         if (err || !newAcct) { toast.error(err?.message || "Failed"); setAutoConnectLoading(null); return; }
         accountId = newAcct.id; setSelectedAccount(accountId);
       }
       await supabase.from("social_connections").upsert({ account_id: accountId, platform: "whatsapp", platform_user_id: waPhoneNumberId, platform_username: username, access_token: waAccessToken, is_connected: true, scopes: [], metadata: { verified_name: profile.verified_name, display_phone_number: profile.display_phone_number, quality_rating: profile.quality_rating, waba_id: waBusinessId, connected_via: "automated_token" } }, { onConflict: "account_id,platform" });
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
         const { data: newAcct, error: err } = await supabase.from("managed_accounts").insert({ username: signalPhoneNumber, display_name: signalPhoneNumber, platform: "signal", status: "active" }).select("id").single();
         if (err || !newAcct) { toast.error(err?.message || "Failed"); setAutoConnectLoading(null); return; }
         accountId = newAcct.id; setSelectedAccount(accountId);
       }
       await supabase.from("social_connections").upsert({ account_id: accountId, platform: "signal", platform_user_id: signalPhoneNumber, platform_username: signalPhoneNumber, access_token: signalApiUrl, is_connected: true, scopes: [], metadata: { api_url: signalApiUrl, phone_number: signalPhoneNumber, connected_via: "automated_api" } }, { onConflict: "account_id,platform" });
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
             const { data: newAcct, error: err } = await supabase.from("managed_accounts").insert({ username, display_name: username, platform: "youtube", status: "active", avatar_url: channel?.snippet?.thumbnails?.default?.url || null }).select("id").single();
             if (err || !newAcct) { toast.error(err?.message || "Failed"); setAutoConnectLoading(null); return; }
             accountId = newAcct.id; setSelectedAccount(accountId);
           }
           await supabase.from("social_connections").upsert({ account_id: accountId, platform: "youtube", platform_user_id: channel?.id || "", platform_username: username, access_token: accessToken, refresh_token: data.data?.refresh_token || null, is_connected: true, scopes: [], metadata: { title: channel?.snippet?.title, thumbnail: channel?.snippet?.thumbnails?.default?.url, subscribers: channel?.statistics?.subscriberCount, connected_via: "automated_oauth" } }, { onConflict: "account_id,platform" });
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
             const { data: newAcct, error: err } = await supabase.from("managed_accounts").insert({ username, display_name: profile.business_name || username, platform: "pinterest", status: "active", avatar_url: profile.profile_image || null }).select("id").single();
             if (err || !newAcct) { toast.error(err?.message || "Failed"); setAutoConnectLoading(null); return; }
             accountId = newAcct.id; setSelectedAccount(accountId);
           }
           await supabase.from("social_connections").upsert({ account_id: accountId, platform: "pinterest", platform_user_id: profile.id || "", platform_username: username, access_token: accessToken, refresh_token: data.data?.refresh_token || null, is_connected: true, scopes: [], metadata: { business_name: profile.business_name, profile_image: profile.profile_image, connected_via: "automated_oauth" } }, { onConflict: "account_id,platform" });
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
         const { data: newAcct, error: err } = await supabase.from("managed_accounts").insert({ username, display_name: username, platform: "discord", status: "active", avatar_url: botInfo.avatar ? `https://cdn.discordapp.com/avatars/${botInfo.id}/${botInfo.avatar}.png` : null }).select("id").single();
         if (err || !newAcct) { toast.error(err?.message || "Failed"); setAutoConnectLoading(null); return; }
         accountId = newAcct.id; setSelectedAccount(accountId);
       }
       await supabase.from("social_connections").upsert({ account_id: accountId, platform: "discord", platform_user_id: botInfo.id || "", platform_username: username, access_token: discordBotToken, is_connected: true, scopes: [], metadata: { username: botInfo.username, discriminator: botInfo.discriminator, avatar: botInfo.avatar, connected_via: "automated_bot_token" } }, { onConflict: "account_id,platform" });
       await loadAccounts(); await loadData(accountId);
       toast.success(`✅ ${username} Discord bot connected!`);
     } catch (e: any) { toast.error(e.message); }
     setAutoConnectLoading(null);
   };

   // ===== AUTOMATED FACEBOOK CONNECT =====
   const automatedFacebookConnect = () => {
     if (!fbAppId) { toast.error("Enter your Facebook App ID first"); return; }
     const scopes = "public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_metadata,pages_read_user_content,pages_messaging,publish_video,groups_access_member_info,business_management";
     const authUrl = `https://www.facebook.com/v24.0/dialog/oauth?client_id=${fbAppId}&redirect_uri=${encodeURIComponent(oauthRedirectUri)}&scope=${scopes}&response_type=token`;
     const authWindow = window.open(authUrl, "fb_oauth", "width=600,height=700,scrollbars=yes");
     setAutoConnectLoading("facebook");
     toast.info("Authenticate with Facebook...");
     const interval = setInterval(async () => {
       try {
         if (!authWindow || authWindow.closed) { clearInterval(interval); setAutoConnectLoading(null); return; }
         const url = authWindow.location.href;
         if (url.includes("access_token=")) {
           const hash = authWindow.location.hash.substring(1);
           const pms = new URLSearchParams(hash);
           const token = pms.get("access_token");
           authWindow.close(); clearInterval(interval);
           if (!token) { setAutoConnectLoading(null); toast.error("No token"); return; }
           const profileRes = await fetch(`https://graph.facebook.com/v24.0/me?fields=id,name,email,picture.width(200)&access_token=${token}`);
           const profile = await profileRes.json();
           if (profile.error) { toast.error(profile.error.message); setAutoConnectLoading(null); return; }
           const username = profile.name || "facebook_user";
           let accountId = selectedAccount;
           if (!accountId) {
             const { data: newAcct, error: err } = await supabase.from("managed_accounts").insert({ username, display_name: profile.name, platform: "facebook", status: "active", avatar_url: profile.picture?.data?.url || null }).select("id").single();
             if (err || !newAcct) { toast.error(err?.message || "Failed"); setAutoConnectLoading(null); return; }
             accountId = newAcct.id; setSelectedAccount(accountId);
           }
           await supabase.from("social_connections").upsert({ account_id: accountId, platform: "facebook", platform_user_id: profile.id || "", platform_username: username, access_token: token, is_connected: true, scopes: [], metadata: { name: profile.name, picture_url: profile.picture?.data?.url, email: profile.email, connected_via: "automated_oauth" } }, { onConflict: "account_id,platform" });
           await loadAccounts(); await loadData(accountId);
           toast.success(`✅ ${username} Facebook connected!`);
           setAutoConnectLoading(null);
         }
       } catch { /* cross-origin */ }
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
    if (igConn) { const d = await callApi("instagram-api", { action: "get_profile" }); if (d) setIgProfile(d); }
    if (ttConn) { const d = await callApi("tiktok-api", { action: "get_user_info" }); if (d) setTtProfile(d?.data?.user || d); }
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

  const navigateToConnect = (platform: string) => {
    setActiveSubTab("connect");
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

  // Pre-fetch Instagram App ID from backend on mount
  useEffect(() => {
    supabase.functions.invoke("ig-oauth-callback", { body: { action: "get_app_id" } })
      .then(({ data }) => { if (data?.app_id) setCachedIgAppId(data.app_id); })
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
    const publishedOrigin = "https://ozcagency.com";
    const redirectUri = `${publishedOrigin}/ig-login`;
    const scope = "instagram_business_basic,instagram_business_content_publish,instagram_business_manage_comments,instagram_business_manage_messages,instagram_business_manage_insights";
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
        const { access_token, user_id, username, expires_in, name, profile_picture_url, session_id, csrf_token, ds_user_id } = payload;
        
        if (!access_token && !session_id) return;
        
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
            }).select("id").single();
            if (createErr || !newAccount) { toast.error(createErr?.message || "Failed to create account"); return; }
            accountId = newAccount.id;
            setSelectedAccount(accountId);
            toast.success(`Account @${username} created`);
          }
          
          // Get existing metadata to preserve any previously saved data
          const { data: existingConn } = await supabase
            .from("social_connections")
            .select("metadata")
            .eq("account_id", accountId)
            .eq("platform", "instagram")
            .maybeSingle();
          
          const existingMeta = (existingConn?.metadata as any) || {};
          
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
          }, { onConflict: "account_id,platform" });
          
          // Sync managed account with profile data (same as main connect form)
          await supabase.from("managed_accounts").update({
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
          // Use silent fetch (no toast on error) — token may not be propagated yet
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
        } catch (e: any) {
          toast.error("Failed to save connection: " + e.message);
        }
      }
    };
    window.addEventListener("message", handleMessage);
    const check = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(check);
          setIgLoginPopupLoading(false);
          window.removeEventListener("message", handleMessage);
        }
      } catch {
        clearInterval(check);
        setIgLoginPopupLoading(false);
        window.removeEventListener("message", handleMessage);
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
          <div key={c.id} className="flex items-center gap-1.5 bg-muted/40 rounded-full px-2 py-0.5 border border-border">
            {(c.metadata as any)?.profile_picture_url || (c.metadata as any)?.profile_image_url || (c.metadata as any)?.icon_img || (c.metadata as any)?.avatar_url ? (
              <img src={(c.metadata as any).profile_picture_url || (c.metadata as any).profile_image_url || (c.metadata as any).icon_img || (c.metadata as any).avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                {c.platform === "instagram" ? <Instagram className="h-3 w-3 text-pink-400" /> : c.platform === "tiktok" ? <Music2 className="h-3 w-3 text-cyan-400" /> : c.platform === "twitter" ? <Twitter className="h-3 w-3 text-blue-400" /> : c.platform === "reddit" ? <Globe className="h-3 w-3 text-orange-400" /> : <Phone className="h-3 w-3 text-blue-400" />}
              </div>
            )}
            <span className="text-xs text-foreground font-medium">@{c.platform_username}</span>
            <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Tabs */}
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
              { v: "connect", icon: Plus, l: "Connect" },
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
          {/* Main Play/Pause Control */}
          <Card className={`border-2 transition-colors ${autoRespondActive ? "border-red-500/50 bg-red-500/5" : "border-border"}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-400" />
                    AI Auto-DM Responder
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {autoRespondActive ? "AI is actively responding to incoming DMs as a young woman with no emojis, casual texting style" : "Click Play to start auto-responding to all incoming DMs"}
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={toggleAutoRespond}
                  disabled={autoRespondLoading}
                  className={`h-14 w-14 rounded-full p-0 ${autoRespondActive ? "bg-red-500 hover:bg-red-600 text-white" : "bg-green-500 hover:bg-green-600 text-white"}`}
                >
                  {autoRespondActive ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
                </Button>
              </div>

              {autoRespondActive && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-medium text-red-400">LIVE — AI is responding to DMs in real-time</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">OF Redirect URL</label>
                  <Input value={aiDmRedirectUrl} onChange={e => setAiDmRedirectUrl(e.target.value)} placeholder="https://onlyfans.com/..." className="text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Trigger Keywords (comma separated)</label>
                  <Input value={aiDmKeywords} onChange={e => setAiDmKeywords(e.target.value)} placeholder="content, exclusive, private, subscribe..." className="text-sm" />
                </div>
                <Button size="sm" variant="outline" className="text-foreground" onClick={saveAutoRespondConfig}>Save Config</Button>
              </div>
            </CardContent>
          </Card>


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

        {/* ===== CONNECT ===== */}
        <TabsContent value="connect" className="space-y-4 mt-4">
          <Tabs defaultValue="one-click" className="space-y-4">
            <TabsList className="bg-muted/50 p-1 rounded-lg">
              <TabsTrigger value="one-click" className="text-xs gap-1.5 data-[state=active]:bg-background">
                <Zap className="h-3.5 w-3.5" /> One-Click Connect
              </TabsTrigger>
              <TabsTrigger value="session" className="text-xs gap-1.5 data-[state=active]:bg-background">
                <Key className="h-3.5 w-3.5" /> Session & Credentials
              </TabsTrigger>
            </TabsList>

            {/* ===== SESSION & CREDENTIALS SUBTAB (DEFAULT) ===== */}
            <TabsContent value="session" className="space-y-4">
              {/* Manual Connection - FIRST */}
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
                      <Input value={connectForm.refresh_token} onChange={e => setConnectForm(p => ({ ...p, refresh_token: e.target.value }))} placeholder="Refresh Token (optional)" type="password" className="text-sm" />
                    </>
                  ) : connectForm.platform === "telegram" ? (
                    <>
                      <Input value={connectForm.platform_username} onChange={e => setConnectForm(p => ({ ...p, platform_username: e.target.value }))} placeholder="Bot Username" className="text-sm" />
                      <Input value={connectForm.access_token} onChange={e => setConnectForm(p => ({ ...p, access_token: e.target.value }))} placeholder="Bot Token (from @BotFather)" type="password" className="text-sm" />
                    </>
                  ) : connectForm.platform === "discord" ? (
                    <>
                      <Input value={connectForm.platform_username} onChange={e => setConnectForm(p => ({ ...p, platform_username: e.target.value }))} placeholder="Bot Username" className="text-sm" />
                      <Input value={connectForm.access_token} onChange={e => setConnectForm(p => ({ ...p, access_token: e.target.value }))} placeholder="Bot Token (from discord.com/developers)" type="password" className="text-sm" />
                    </>
                  ) : connectForm.platform === "signal" ? (
                    <>
                      <Input value={connectForm.platform_username} onChange={e => setConnectForm(p => ({ ...p, platform_username: e.target.value }))} placeholder="Phone Number (+1234...)" className="text-sm" />
                      <Input value={connectForm.access_token} onChange={e => setConnectForm(p => ({ ...p, access_token: e.target.value }))} placeholder="Signal API URL (http://localhost:8080)" className="text-sm" />
                    </>
                  ) : connectForm.platform === "youtube" ? (
                    <>
                      <Input value={connectForm.platform_username} onChange={e => setConnectForm(p => ({ ...p, platform_username: e.target.value }))} placeholder="Channel Name" className="text-sm" />
                      <Input value={connectForm.platform_user_id} onChange={e => setConnectForm(p => ({ ...p, platform_user_id: e.target.value }))} placeholder="Channel ID" className="text-sm" />
                      <Input value={connectForm.access_token} onChange={e => setConnectForm(p => ({ ...p, access_token: e.target.value }))} placeholder="OAuth Access Token" type="password" className="text-sm" />
                      <Input value={connectForm.refresh_token} onChange={e => setConnectForm(p => ({ ...p, refresh_token: e.target.value }))} placeholder="Refresh Token" type="password" className="text-sm" />
                    </>
                  ) : connectForm.platform === "snapchat" ? (
                    <>
                      <Input value={connectForm.platform_username} onChange={e => setConnectForm(p => ({ ...p, platform_username: e.target.value }))} placeholder="Organization/Account Name" className="text-sm" />
                      <Input value={connectForm.access_token} onChange={e => setConnectForm(p => ({ ...p, access_token: e.target.value }))} placeholder="OAuth Access Token" type="password" className="text-sm" />
                      <Input value={connectForm.refresh_token} onChange={e => setConnectForm(p => ({ ...p, refresh_token: e.target.value }))} placeholder="Refresh Token" type="password" className="text-sm" />
                    </>
                  ) : (
                    <>
                      <Input value={connectForm.platform_username} onChange={e => setConnectForm(p => ({ ...p, platform_username: e.target.value }))} placeholder="Username" className="text-sm" />
                      <Input value={connectForm.platform_user_id} onChange={e => setConnectForm(p => ({ ...p, platform_user_id: e.target.value }))} placeholder="User ID" className="text-sm" />
                      <Input value={connectForm.access_token} onChange={e => setConnectForm(p => ({ ...p, access_token: e.target.value }))} placeholder="Access Token / API Key" type="password" className="text-sm" />
                      <Input value={connectForm.refresh_token} onChange={e => setConnectForm(p => ({ ...p, refresh_token: e.target.value }))} placeholder="Refresh Token (optional)" type="password" className="text-sm" />
                    </>
                  )}
                  <Button onClick={connectPlatform} size="sm" variant="outline" className="text-foreground"><Plus className="h-3.5 w-3.5 mr-1" />Connect Manually</Button>
                </CardContent>
              </Card>

              {/* Instagram Session Cookie - SECOND */}
              {igConnected && (
                <Card id="ig-session-section" className={`border-pink-500/20 ring-2 ring-pink-500/10 transition-all ${igSessionPulse ? "animate-session-pulse" : ""}`}>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Key className="h-4 w-4 text-pink-400" />
                        Instagram Session
                      </h4>
                      <div className="flex items-center gap-2">
                        {igSessionStatus === "valid" && igSessionId && (
                          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Session Active
                          </Badge>
                        )}
                        {!igSessionId && (() => {
                          const igConn = connections.find(c => c.platform === "instagram" && c.is_connected);
                          const meta = (igConn?.metadata as any) || {};
                          const connUsername = igConn?.platform_username;
                          if (meta.ig_access_token || meta.ig_session_source === "oauth_token") {
                            return (
                              <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px]">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Logged into Instagram @{connUsername}
                              </Badge>
                            );
                          }
                          return null;
                        })()}
                        {igSessionStatus === "expired" && (
                          <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Expired
                          </Badge>
                        )}
                        {igSessionStatus === "unknown" && !igSessionId && !connections.find(c => c.platform === "instagram" && c.is_connected && ((c.metadata as any)?.ig_access_token || (c.metadata as any)?.ig_session_source === "oauth_token")) && (
                          <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">
                            <AlertCircle className="h-3 w-3 mr-1" /> Not Set
                          </Badge>
                        )}
                        {igSessionSavedAt && (
                          <span className="text-[9px] text-muted-foreground">
                            Saved: {new Date(igSessionSavedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {igSessionId && igSessionStatus === "valid"
                        ? "Session cookie is active and synced across all social media features (discover, mass comment, like, follow, DMs)."
                        : (() => {
                            const igConn = connections.find(c => c.platform === "instagram" && c.is_connected);
                            const meta = (igConn?.metadata as any) || {};
                            if (meta.ig_access_token || meta.ig_session_source === "oauth_token") {
                              return "Logged in via Instagram OAuth (Graph API). For private API features (discover external posts, mass comment, like, follow), paste your session cookie below.";
                            }
                            return "A valid session cookie is required to discover posts, mass comment, like, and follow on other accounts' content. Use \"Login\" for OAuth or paste a session cookie below.";
                          })()}
                    </p>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-medium text-foreground mb-1 block">Session ID <span className="text-destructive">*</span></label>
                        <Input value={igSessionId} onChange={e => setIgSessionId(e.target.value)} placeholder="Paste your sessionid cookie value here..." className="text-xs font-mono" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-medium text-foreground mb-1 block">CSRF Token</label>
                          <Input value={igCsrfToken} onChange={e => setIgCsrfToken(e.target.value)} placeholder="csrftoken cookie value" className="text-xs font-mono" />
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-foreground mb-1 block">DS User ID</label>
                          <Input value={igDsUserId} onChange={e => setIgDsUserId(e.target.value)} placeholder="ds_user_id cookie value" className="text-xs font-mono" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button size="sm" onClick={openIgLoginPopup} disabled={igLoginPopupLoading} className="gap-1.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white border-0">
                        {igLoginPopupLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Instagram className="h-3.5 w-3.5" />}
                        Login
                      </Button>
                      <Button size="sm" onClick={saveIgSessionData} disabled={igSessionLoading || !igSessionId.trim()} className="gap-1.5">
                        {igSessionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Save Session
                      </Button>
                      <Button size="sm" variant="secondary" onClick={findSessions} disabled={findSessionsLoading || sessionAutoConnectLoading} className="gap-1.5">
                        {findSessionsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                        Find Sessions
                      </Button>
                      <Button size="sm" variant="outline" onClick={testIgSession} disabled={igSessionLoading} className="gap-1.5 text-foreground">
                        {igSessionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
                        Test Session
                      </Button>
                    </div>

                    {foundSessions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold text-foreground">Found Sessions — click to connect:</p>
                        <div className="flex flex-wrap gap-2">
                          {foundSessions.map(s => (
                            <button
                              key={s.id}
                              onClick={() => selectFoundSession(s)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                                s.status === "active"
                                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25"
                                  : s.status === "expired"
                                  ? "bg-red-500/15 border-red-500/40 text-red-400 hover:bg-red-500/25"
                                  : "bg-yellow-500/15 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/25"
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                s.status === "active" ? "bg-emerald-400" : s.status === "expired" ? "bg-red-400" : "bg-yellow-400"
                              }`} />
                              {s.source}
                              <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 ${
                                s.status === "active" ? "border-emerald-500/50 text-emerald-400" : s.status === "expired" ? "border-red-500/50 text-red-400" : "border-yellow-500/50 text-yellow-400"
                              }`}>
                                {s.status}
                              </Badge>
                              {s.dsUserId && <span className="text-[9px] opacity-60">ID: …{s.dsUserId.slice(-4)}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <Card className="bg-muted/30 border-border">
                      <CardContent className="p-3 space-y-2">
                        <p className="text-[10px] font-semibold text-foreground">🔐 "Login" connects via Instagram OAuth (Graph API)</p>
                        <p className="text-[10px] text-muted-foreground">This grants access to your own posts, comments, insights, and publishing. For private API features (discover external posts, mass comment, like, follow), you need a <strong>session cookie</strong> from DevTools.</p>
                        <div className="border-t border-border my-2" />
                        <p className="text-[10px] font-semibold text-foreground">Manual alternative:</p>
                        <ol className="text-[10px] text-muted-foreground space-y-1 list-decimal list-inside">
                          <li>Open <strong>instagram.com</strong> in your browser and log in</li>
                          <li>Open DevTools (F12) → <strong>Application</strong> tab → <strong>Cookies</strong></li>
                          <li>Find <code className="bg-muted px-1 rounded text-foreground">sessionid</code> — copy its value</li>
                          <li>Paste above and click <strong>Save Session</strong></li>
                        </ol>
                        <p className="text-[9px] text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Session cookies expire every few days. Re-login when you see "expired" errors.
                        </p>
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>
              )}




              {connections.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold text-foreground mb-3">Connected Accounts</h4>
                    <div className="space-y-3">
                      {connections.map(c => {
                        const meta = (c.metadata || {}) as any;
                        const profilePic = meta.profile_picture_url || meta.avatar_url || meta.profile_image_url || meta.icon_img || meta.picture_url || meta.thumbnail;
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
              {/* Header */}
              <div>
                <h3 className="text-sm font-bold text-foreground tracking-tight">Connect Platforms</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Tap to link your accounts instantly</p>
              </div>

              {/* Platform Grid */}
              <div className="grid grid-cols-5 gap-2.5">
                {/* Instagram cube */}
                {(() => {
                  const isLoading = igLoginPopupLoading;
                  return (
                    <button
                      onClick={openIgLoginPopup}
                      disabled={isLoading}
                      className="group/cube relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-pink-500/40 hover:bg-pink-500/5 hover:shadow-[0_0_24px_-5px] hover:shadow-pink-500/20 disabled:opacity-50 disabled:pointer-events-none aspect-square"
                    >
                      {igConnected && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-green-400 shadow-[0_0_6px] shadow-green-400/60" />}
                      <div className="relative">
                        {isLoading ? <Loader2 className="h-8 w-8 text-pink-400 animate-spin" /> : <Instagram className="h-8 w-8 text-pink-400 transition-all duration-300 group-hover/cube:text-pink-300 group-hover/cube:drop-shadow-[0_0_12px_rgba(236,72,153,0.5)]" />}
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground group-hover/cube:text-foreground transition-colors leading-tight text-center">Connect Instagram</span>
                    </button>
                  );
                })()}

                {/* Facebook cube with real logo */}
                {(() => {
                  const isLoading = autoConnectLoading === "facebook";
                  const needsFields = !fbAppId;
                  return (
                    <div className="group/wrap relative">
                      <button
                        onClick={() => { if (needsFields) { const el = document.getElementById("connect-expand-facebook"); if (el) el.classList.toggle("hidden"); } else { automatedFacebookConnect(); } }}
                        disabled={isLoading}
                        className="group/cube relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-blue-500/40 hover:bg-blue-500/5 hover:shadow-[0_0_24px_-5px] hover:shadow-blue-500/20 disabled:opacity-50 disabled:pointer-events-none aspect-square w-full"
                      >
                        {facebookConnected && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-green-400 shadow-[0_0_6px] shadow-green-400/60" />}
                        <div className="relative">
                          {isLoading ? <Loader2 className="h-8 w-8 text-blue-500 animate-spin" /> : (
                            <svg viewBox="0 0 24 24" className="h-8 w-8 transition-all duration-300 group-hover/cube:drop-shadow-[0_0_12px_rgba(59,130,246,0.5)]" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground group-hover/cube:text-foreground transition-colors leading-tight text-center">Connect Facebook</span>
                      </button>
                      <div id="connect-expand-facebook" className="hidden absolute z-20 top-full left-0 mt-1.5 w-56 p-3 rounded-xl border border-border bg-card shadow-xl space-y-2 animate-fade-in">
                        <Input value={fbAppId} onChange={e => setFbAppId(e.target.value)} placeholder="App ID" className="text-xs h-7" />
                        <Button size="sm" onClick={() => { automatedFacebookConnect(); const el = document.getElementById("connect-expand-facebook"); if (el) el.classList.add("hidden"); }} disabled={isLoading} className="w-full h-7 text-[10px]">{isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Connect"}</Button>
                      </div>
                    </div>
                  );
                })()}

                {[
                  { id: "tiktok", label: "Connect TikTok", svgIcon: <svg viewBox="0 0 24 24" className="h-8 w-8 transition-all duration-300 group-hover/cube:drop-shadow-[0_0_12px_rgba(34,211,238,0.5)]" fill="#00f2ea"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.76 1.52V6.84a4.84 4.84 0 0 1-1-.15z"/></svg>, hoverBorder: "hover:border-cyan-400/40", hoverBg: "hover:bg-cyan-400/5", hoverShadow: "hover:shadow-cyan-400/20", connected: ttConnected, action: automatedTikTokConnect, expandFields: [{ val: ttClientKey, set: setTtClientKey, placeholder: "Client Key", type: "text" }, { val: ttClientSecret, set: setTtClientSecret, placeholder: "Secret", type: "password" }] },
                  { id: "twitter", label: "Connect X", svgIcon: <svg viewBox="0 0 24 24" className="h-8 w-8 transition-all duration-300 group-hover/cube:drop-shadow-[0_0_12px_rgba(56,189,248,0.5)]" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>, hoverBorder: "hover:border-sky-400/40", hoverBg: "hover:bg-sky-400/5", hoverShadow: "hover:shadow-sky-400/20", connected: xConnected, action: automatedTwitterConnect, expandFields: [{ val: xClientId, set: setXClientId, placeholder: "Client ID", type: "text" }, { val: xClientSecret, set: setXClientSecret, placeholder: "Secret", type: "password" }] },
                  { id: "reddit", label: "Connect Reddit", svgIcon: <svg viewBox="0 0 24 24" className="h-8 w-8 transition-all duration-300 group-hover/cube:drop-shadow-[0_0_12px_rgba(251,146,60,0.5)]" fill="#FF4500"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 0-.463.327.327 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>, hoverBorder: "hover:border-orange-400/40", hoverBg: "hover:bg-orange-400/5", hoverShadow: "hover:shadow-orange-400/20", connected: redditConnected, action: automatedRedditConnect, expandFields: [{ val: redditClientId, set: setRedditClientId, placeholder: "App ID", type: "text" }, { val: redditClientSecret, set: setRedditClientSecret, placeholder: "Secret", type: "password" }] },
                  { id: "telegram", label: "Connect Telegram", svgIcon: <svg viewBox="0 0 24 24" className="h-8 w-8 transition-all duration-300 group-hover/cube:drop-shadow-[0_0_12px_rgba(96,165,250,0.5)]" fill="#26A5E4"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>, hoverBorder: "hover:border-blue-400/40", hoverBg: "hover:bg-blue-400/5", hoverShadow: "hover:shadow-blue-400/20", connected: telegramConnected, action: automatedTelegramConnect, expandFields: [{ val: telegramBotToken, set: setTelegramBotToken, placeholder: "Bot Token", type: "password" }] },
                  { id: "threads", label: "Connect Threads", svgIcon: <svg viewBox="0 0 24 24" className="h-8 w-8 transition-all duration-300 group-hover/cube:drop-shadow-[0_0_12px_rgba(192,132,252,0.5)]" fill="currentColor"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.17.408-2.256 1.33-3.058.88-.766 2.072-1.213 3.453-1.298.988-.06 1.946.009 2.854.166-.09-.478-.244-.892-.464-1.228-.355-.544-.903-.822-1.63-.826h-.032c-.568 0-1.3.174-1.92.844l-1.378-1.34c.93-.957 2.1-1.463 3.3-1.463h.058c2.816.017 3.858 2.163 4.072 3.534.118.753.144 1.58.086 2.47l-.012.174c.548.396 1.016.867 1.38 1.412.675 1.009 1.087 2.31.876 4.086-.262 2.213-1.518 4.078-3.543 5.252C17.408 23.35 14.987 24 12.186 24zm.267-7.907c-1.033.06-2.263.422-2.604 1.985.256.253.727.545 1.403.584 1.09.06 1.88-.334 2.35-1.17.267-.478.432-1.075.485-1.777a8.456 8.456 0 0 0-1.634.378z"/></svg>, hoverBorder: "hover:border-purple-400/40", hoverBg: "hover:bg-purple-400/5", hoverShadow: "hover:shadow-purple-400/20", connected: threadsConnected, action: automatedThreadsConnect, expandFields: [{ val: threadsAppId, set: setThreadsAppId, placeholder: "App ID", type: "text" }, { val: threadsAppSecret, set: setThreadsAppSecret, placeholder: "Secret", type: "password" }] },
                  { id: "whatsapp", label: "Connect WhatsApp", svgIcon: <svg viewBox="0 0 24 24" className="h-8 w-8 transition-all duration-300 group-hover/cube:drop-shadow-[0_0_12px_rgba(74,222,128,0.5)]" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>, hoverBorder: "hover:border-green-400/40", hoverBg: "hover:bg-green-400/5", hoverShadow: "hover:shadow-green-400/20", connected: whatsappConnected, action: automatedWhatsAppConnect, expandFields: [{ val: waPhoneNumberId, set: setWaPhoneNumberId, placeholder: "Phone ID", type: "text" }, { val: waAccessToken, set: setWaAccessToken, placeholder: "Token", type: "password" }] },
                  { id: "snapchat", label: "Connect Snapchat", svgIcon: <svg viewBox="0 0 24 24" className="h-8 w-8 transition-all duration-300 group-hover/cube:drop-shadow-[0_0_12px_rgba(250,204,21,0.5)]" fill="#FFFC00"><path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.032.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .299.04.382.076a.647.647 0 0 1 .3.3c.063.132.079.291.044.451-.075.389-.477.63-.815.771a5.1 5.1 0 0 1-.362.12c-.122.036-.244.075-.387.15-.19.1-.316.278-.396.528-.079.24-.048.481.045.714a6.7 6.7 0 0 0 .316.57c.015.024.03.045.046.068.54.825 1.23 1.473 2.051 1.932.273.149.57.27.865.361.166.049.361.119.46.2a.553.553 0 0 1 .179.293c.06.285-.09.478-.235.586-.232.166-.567.26-.78.3-.346.064-.654.118-.939.328-.165.122-.32.306-.48.509a9.186 9.186 0 0 1-.371.433c-.36.4-.825.6-1.395.6-.304 0-.636-.054-.965-.161-.578-.191-1.068-.307-1.494-.36-1.694.27-3.16 1.337-3.88 1.793-.157.1-.27.168-.378.229-.387.211-.742.319-1.085.319-.349 0-.71-.111-1.104-.328a6.15 6.15 0 0 1-.331-.198c-.69-.43-2.146-1.5-3.867-1.793-.422.053-.909.169-1.482.36-.335.107-.672.161-.98.161a2.29 2.29 0 0 1-1.371-.576c-.159-.13-.291-.3-.372-.436-.284-.465-.272-.689-.479-.809a5.15 5.15 0 0 0-.938-.328c-.213-.04-.547-.134-.779-.3-.143-.107-.294-.3-.234-.587.022-.11.075-.211.179-.293.098-.08.293-.149.458-.2.293-.09.59-.21.863-.36.821-.457 1.513-1.106 2.053-1.932.016-.023.032-.045.046-.07.105-.16.21-.33.316-.569.093-.233.124-.474.046-.714-.08-.25-.206-.427-.396-.528a3.022 3.022 0 0 0-.387-.15 5.1 5.1 0 0 1-.363-.12c-.338-.14-.74-.382-.815-.77a.565.565 0 0 1 .044-.452.645.645 0 0 1 .3-.3c.084-.036.199-.076.382-.076.12 0 .299.015.463.104.376.182.735.317 1.034.3.199 0 .326-.044.401-.088l-.033-.51-.003-.06c-.104-1.63-.23-3.654.3-4.848C7.46 1.07 10.804.793 11.794.793h.412z"/></svg>, hoverBorder: "hover:border-yellow-400/40", hoverBg: "hover:bg-yellow-400/5", hoverShadow: "hover:shadow-yellow-400/20", connected: snapchatConnected, action: automatedSnapchatConnect, expandFields: [{ val: snapClientId, set: setSnapClientId, placeholder: "Client ID", type: "text" }, { val: snapClientSecret, set: setSnapClientSecret, placeholder: "Secret", type: "password" }] },
                  { id: "youtube", label: "Connect YouTube", svgIcon: <svg viewBox="0 0 24 24" className="h-8 w-8 transition-all duration-300 group-hover/cube:drop-shadow-[0_0_12px_rgba(248,113,113,0.5)]" fill="#FF0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>, hoverBorder: "hover:border-red-400/40", hoverBg: "hover:bg-red-400/5", hoverShadow: "hover:shadow-red-400/20", connected: youtubeConnected, action: automatedYouTubeConnect, expandFields: [{ val: ytClientId, set: setYtClientId, placeholder: "Client ID", type: "text" }, { val: ytClientSecret, set: setYtClientSecret, placeholder: "Secret", type: "password" }] },
                  { id: "pinterest", label: "Connect Pinterest", svgIcon: <svg viewBox="0 0 24 24" className="h-8 w-8 transition-all duration-300 group-hover/cube:drop-shadow-[0_0_12px_rgba(251,113,133,0.5)]" fill="#E60023"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z"/></svg>, hoverBorder: "hover:border-rose-400/40", hoverBg: "hover:bg-rose-400/5", hoverShadow: "hover:shadow-rose-400/20", connected: pinterestConnected, action: automatedPinterestConnect, expandFields: [{ val: pinAppId, set: setPinAppId, placeholder: "App ID", type: "text" }, { val: pinAppSecret, set: setPinAppSecret, placeholder: "Secret", type: "password" }] },
                  { id: "discord", label: "Connect Discord", svgIcon: <svg viewBox="0 0 24 24" className="h-8 w-8 transition-all duration-300 group-hover/cube:drop-shadow-[0_0_12px_rgba(129,140,248,0.5)]" fill="#5865F2"><path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.838-9.674-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/></svg>, hoverBorder: "hover:border-indigo-400/40", hoverBg: "hover:bg-indigo-400/5", hoverShadow: "hover:shadow-indigo-400/20", connected: discordConnected, action: automatedDiscordConnect, expandFields: [{ val: discordBotToken, set: setDiscordBotToken, placeholder: "Bot Token", type: "password" }] },
                  { id: "signal", label: "Connect Signal", svgIcon: <svg viewBox="0 0 24 24" className="h-8 w-8 transition-all duration-300 group-hover/cube:drop-shadow-[0_0_12px_rgba(125,211,252,0.5)]" fill="#3A76F0"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 3.6A8.4 8.4 0 0 1 20.4 12 8.4 8.4 0 0 1 12 20.4 8.4 8.4 0 0 1 3.6 12 8.4 8.4 0 0 1 12 3.6z"/></svg>, hoverBorder: "hover:border-sky-300/40", hoverBg: "hover:bg-sky-300/5", hoverShadow: "hover:shadow-sky-300/20", connected: signalConnected, action: automatedSignalConnect, expandFields: [{ val: signalApiUrl, set: setSignalApiUrl, placeholder: "API URL", type: "text" }, { val: signalPhoneNumber, set: setSignalPhoneNumber, placeholder: "Phone", type: "text" }] },
                ].map(p => {
                  const isLoading = autoConnectLoading === p.id;
                  const needsFields = p.expandFields.some(f => !f.val);
                  return (
                    <div key={p.id} className="group/wrap relative">
                      <button
                        onClick={() => {
                          if (needsFields) {
                            const el = document.getElementById(`connect-expand-${p.id}`);
                            if (el) el.classList.toggle("hidden");
                          } else {
                            p.action();
                          }
                        }}
                        disabled={isLoading}
                        className={`group/cube relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 ${p.hoverBorder} ${p.hoverBg} hover:shadow-[0_0_24px_-5px] ${p.hoverShadow} disabled:opacity-50 disabled:pointer-events-none aspect-square w-full`}
                      >
                        {p.connected && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-green-400 shadow-[0_0_6px] shadow-green-400/60" />}
                        <div className="relative">
                          {isLoading ? <Loader2 className="h-8 w-8 animate-spin opacity-60" /> : p.svgIcon}
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground group-hover/cube:text-foreground transition-colors leading-tight text-center">{p.label}</span>
                      </button>
                      <div id={`connect-expand-${p.id}`} className="hidden absolute z-20 top-full left-0 mt-1.5 w-56 p-3 rounded-xl border border-border bg-card shadow-xl space-y-2 animate-fade-in">
                        {p.expandFields.map((f, i) => (
                          <Input key={i} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} type={f.type} className="text-xs h-7" />
                        ))}
                        <Button size="sm" onClick={() => { p.action(); const el = document.getElementById(`connect-expand-${p.id}`); if (el) el.classList.add("hidden"); }} disabled={isLoading} className="w-full h-7 text-[10px]">
                          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Connect"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SocialMediaHub;

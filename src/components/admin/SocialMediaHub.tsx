import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import SocialAITools from "./SocialAITools";
import LiveDMConversations from "./LiveDMConversations";
import IGAutomationSuite from "./social/IGAutomationSuite";
import BioLinksManager from "./social/BioLinksManager";
import { toast } from "sonner";
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
  Globe, Users, Heart, Share2, Clock, CheckCircle2, AlertCircle,
  Search, Hash, Zap, Shield, Download,
  Image, Video, Play, Pause, Radio, Star, Target,
  Activity, Copy, Wifi, WifiOff,
  MessageCircle, LayoutDashboard, Compass,
  Sparkles, Bot, Brain, Wand2, AtSign, Megaphone, FolderOpen,
  PieChart, Layers,
} from "lucide-react";

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
  const [oauthAppId, setOauthAppId] = useState(() => localStorage.getItem("meta_oauth_app_id") || "");
  const [oauthListening, setOauthListening] = useState(false);
  const [oauthProcessing, setOauthProcessing] = useState(false);

  useEffect(() => { loadAccounts(); }, []);
  useEffect(() => {
    if (selectedAccount) {
      loadData();
      loadAutoRespondState();
    }
  }, [selectedAccount]);

  // Auto-capture OAuth token from URL hash on redirect back
  const autoConnectFromToken = useCallback(async (token: string) => {
    setOauthProcessing(true);
    toast.info("Token captured — auto-connecting...");
    try {
      const pagesRes = await fetch(`https://graph.facebook.com/v24.0/me/accounts?access_token=${token}&fields=id,name,instagram_business_account`);
      const pagesData = await pagesRes.json();
      
      let igUserId = "";
      let igUsername = "";
      let igName = "";
      let igProfilePic = "";
      let igFollowers = 0;
      let igMediaCount = 0;

      const pageWithIG = pagesData.data?.find((p: any) => p.instagram_business_account);
      if (pageWithIG?.instagram_business_account?.id) {
        igUserId = pageWithIG.instagram_business_account.id;
        const igRes = await fetch(`https://graph.facebook.com/v24.0/${igUserId}?fields=id,username,name,profile_picture_url,followers_count,media_count,biography&access_token=${token}`);
        const igData = await igRes.json();
        igUsername = igData.username || "";
        igName = igData.name || igData.username || "";
        igProfilePic = igData.profile_picture_url || "";
        igFollowers = igData.followers_count || 0;
        igMediaCount = igData.media_count || 0;
      } else {
        const meRes = await fetch(`https://graph.instagram.com/v24.0/me?fields=id,username&access_token=${token}`);
        const meData = await meRes.json();
        igUserId = meData.id || "";
        igUsername = meData.username || "";
        igName = meData.username || "";
      }

      if (!igUsername) { toast.error("Could not detect Instagram account from this token"); setOauthProcessing(false); return; }

      let accountId = selectedAccount;
      const { data: existingAccounts } = await supabase.from("managed_accounts").select("id").eq("username", igUsername).limit(1);
      if (existingAccounts?.length) {
        accountId = existingAccounts[0].id;
      } else {
        const { data: newAcct, error: createErr } = await supabase.from("managed_accounts").insert({
          username: igUsername, display_name: igName, avatar_url: igProfilePic || null,
          platform: "instagram", status: "active", subscriber_count: igFollowers,
          content_count: igMediaCount,
          social_links: { instagram: `https://instagram.com/${igUsername}`, ig_user_id: igUserId },
          last_activity_at: new Date().toISOString(),
        }).select("id").single();
        if (createErr || !newAcct) { toast.error(createErr?.message || "Failed to create account"); setOauthProcessing(false); return; }
        accountId = newAcct.id;
      }

      await supabase.from("social_connections").upsert({
        account_id: accountId, platform: "instagram", platform_user_id: igUserId,
        platform_username: igUsername, access_token: token, is_connected: true,
        scopes: ["instagram_basic", "instagram_manage_messages", "instagram_manage_comments", "instagram_manage_insights", "instagram_content_publish", "pages_show_list", "pages_read_engagement", "business_management", "ads_read", "ads_management"],
        metadata: { profile_picture_url: igProfilePic, name: igName, followers_count: igFollowers, media_count: igMediaCount, connected_via: "one_click_oauth", connected_at_readable: new Date().toLocaleString() },
      }, { onConflict: "account_id,platform" });

      setSelectedAccount(accountId);
      setIgProfile({ profile_picture_url: igProfilePic, name: igName, username: igUsername, followers_count: igFollowers, media_count: igMediaCount });
      await loadAccounts();
      await loadData(accountId);
      toast.success(`@${igUsername} connected automatically!`);
    } catch (apiErr: any) {
      console.error("Auto-connect error:", apiErr);
      toast.error("Auto-connect failed: " + (apiErr.message || "Unknown error"));
      setConnectForm(prev => ({ ...prev, access_token: token, platform: "instagram" }));
    }
    setOauthProcessing(false);
  }, [selectedAccount]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("access_token=")) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get("access_token");
      // Clear hash from URL
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      if (token) {
        // Switch to connect tab to show progress
        setActiveSubTab("connect");
        autoConnectFromToken(token);
      }
    }
  }, []);

  // Restore profile data from stored connection metadata on session load
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
    const { data } = await supabase.from("managed_accounts").select("id, username, display_name, avatar_url").order("created_at", { ascending: false });
    setAccounts(data || []);
    // Auto-select first account if none selected or current selection no longer exists
    if (data?.length) {
      const currentExists = data.some(a => a.id === selectedAccount);
      if (!selectedAccount || !currentExists) {
        setSelectedAccount(data[0].id);
      }
    }
  };

  const loadData = async (overrideAccountId?: string) => {
    const acctId = overrideAccountId || selectedAccount;
    if (!acctId) return;
    setLoading(true);
    const [conns, socialPosts, links, stats, replies] = await Promise.all([
      supabase.from("social_connections").select("*").eq("account_id", acctId),
      supabase.from("social_posts").select("*").eq("account_id", acctId).order("created_at", { ascending: false }).limit(50),
      supabase.from("bio_links").select("*").eq("account_id", acctId).order("created_at", { ascending: false }),
      supabase.from("social_analytics").select("*").eq("account_id", acctId).order("fetched_at", { ascending: false }).limit(50),
      supabase.from("social_comment_replies").select("*").eq("account_id", acctId).order("created_at", { ascending: false }).limit(50),
    ]);
    setConnections(conns.data || []);
    setPosts(socialPosts.data || []);
    setBioLinks(links.data || []);
    setAnalytics(stats.data || []);
    setCommentReplies(replies.data || []);
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
    // Find platform before deleting for cleanup
    const conn = connections.find(c => c.id === id);
    const platform = conn?.platform;
    
    // Fully delete the connection row — wipes access_token, refresh_token, all credentials
    const { error } = await supabase.from("social_connections").delete().eq("id", id);
    if (error) { toast.error("Failed to disconnect: " + error.message); return; }
    
    // Clear local profile state
    if (platform === "instagram") setIgProfile(null);
    if (platform === "tiktok") setTtProfile(null);
    
    toast.success("Disconnected & credentials wiped");
    await loadData();
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Social Media</h2>
          <p className="text-xs text-muted-foreground">AI Auto-DM · Multi-Platform · Full API</p>
        </div>
        <div className="flex items-center gap-2">
          {apiLoading && <Badge variant="outline" className="text-yellow-400 border-yellow-400/30 animate-pulse"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />API</Badge>}
          <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} className="bg-background border border-border text-foreground rounded-lg px-3 py-1.5 text-sm">
            {accounts.map(a => <option key={a.id} value={a.id}>{a.display_name || a.username}</option>)}
          </select>
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
        {autoRespondActive && (
          <Badge className="bg-red-500/15 text-red-400 border-red-500/30 animate-pulse">
            <Radio className="h-3 w-3 mr-1" />AI Auto-Responding
          </Badge>
        )}
        {/* Mini avatars of connected accounts */}
        {connections.filter(c => c.is_connected).map(c => (
          <div key={c.id} className="flex items-center gap-1.5 bg-muted/40 rounded-full px-2 py-0.5 border border-border">
            {(c.metadata as any)?.profile_picture_url ? (
              <img src={(c.metadata as any).profile_picture_url} alt="" className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                {c.platform === "instagram" ? <Instagram className="h-3 w-3 text-pink-400" /> : <Music2 className="h-3 w-3 text-cyan-400" />}
              </div>
            )}
            <span className="text-xs text-foreground font-medium">@{c.platform_username}</span>
            <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <ScrollArea className="w-full">
          <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 inline-flex w-auto min-w-full">
            {[
              { v: "dashboard", icon: LayoutDashboard, l: "Dashboard" },
              { v: "ai-auto", icon: Brain, l: "AI Auto-DM" },
              { v: "search", icon: Search, l: "Search" },
              { v: "content", icon: Layers, l: "Content" },
              { v: "engagement", icon: MessageSquare, l: "Comments" },
              { v: "messaging", icon: Send, l: "DMs" },
              { v: "ai-tools", icon: Wand2, l: "AI Tools" },
              { v: "analytics", icon: BarChart3, l: "Analytics" },
              { v: "biolink", icon: Link2, l: "Bio Links" },
              { v: "automation", icon: Zap, l: "IG Automation" },
              { v: "connect", icon: Plus, l: "Connect" },
            ].map(t => (
              <TabsTrigger key={t.v} value={t.v} className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground rounded-md gap-1 text-xs px-2.5 py-1.5 whitespace-nowrap">
                <t.icon className="h-3.5 w-3.5" />{t.l}
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>

        {/* ===== DASHBOARD ===== */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={fetchProfiles}><RefreshCw className="h-3.5 w-3.5 mr-1" />Sync Profiles</Button>
            <Button size="sm" variant="outline" onClick={fetchMedia}><Download className="h-3.5 w-3.5 mr-1" />Pull Media</Button>
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
                <Button size="sm" variant="outline" onClick={saveAutoRespondConfig}>Save Config</Button>
              </div>
            </CardContent>
          </Card>

          {/* Persona Info */}
          <Card>
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold text-foreground mb-2">Active Persona</h4>
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                <p>• Young woman, early 20s — chill, warm, subtly seductive</p>
                <p>• No emojis, no apostrophes, minimal punctuation</p>
                <p>• Max 1-2 abbreviations (u, rn, tho, w)</p>
                <p>• Messages can be 3-5 words, quick fire replies</p>
                <p>• Never says "ngl" or "tbh"</p>
                <p>• Natural pauses after 3-4 messages</p>
                <p>• Subtle psychological redirection to bio link</p>
                <p>• Closes convo after successful redirect</p>
                <p>• Consistent voice throughout entire conversation</p>
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
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== SEARCH ===== */}
        <TabsContent value="search" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Search className="h-4 w-4 text-purple-400" />Universal Search</h4>
              <div className="grid grid-cols-3 gap-2">
                <select value={searchType} onChange={e => setSearchType(e.target.value)} className="bg-background border border-border text-foreground rounded-lg px-2 py-1.5 text-sm">
                  <option value="username">By Username</option>
                  <option value="hashtag">By Hashtag</option>
                  <option value="keyword">By Keyword</option>
                  <option value="content">By Content</option>
                </select>
                <select value={searchPlatform} onChange={e => setSearchPlatform(e.target.value)} className="bg-background border border-border text-foreground rounded-lg px-2 py-1.5 text-sm">
                  <option value="both">Both</option>
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                </select>
                <div className="flex gap-1">
                  <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className="text-sm" onKeyDown={e => e.key === "Enter" && performSearch()} />
                  <Button size="sm" onClick={performSearch} disabled={apiLoading}><Search className="h-3.5 w-3.5" /></Button>
                </div>
              </div>

              {searchResults && (
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-2">
                    {searchResults.type === "username" && (
                      <>
                        {searchResults.data?.instagram && (
                          <div className="bg-muted/30 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2"><Instagram className="h-4 w-4 text-pink-400" /><span className="text-xs font-medium text-foreground">Instagram</span></div>
                            <p className="text-sm text-foreground">{searchResults.data.instagram.business_discovery?.name || searchResults.data.instagram.name}</p>
                            <p className="text-xs text-muted-foreground">{searchResults.data.instagram.business_discovery?.biography || searchResults.data.instagram.biography}</p>
                            <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                              <span>{(searchResults.data.instagram.business_discovery?.followers_count || 0).toLocaleString()} followers</span>
                              <span>{(searchResults.data.instagram.business_discovery?.media_count || 0).toLocaleString()} posts</span>
                            </div>
                          </div>
                        )}
                        {searchResults.data?.tiktok && (
                          <div className="bg-muted/30 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2"><Music2 className="h-4 w-4 text-cyan-400" /><span className="text-xs font-medium text-foreground">TikTok</span></div>
                            <p className="text-sm text-foreground">{JSON.stringify(searchResults.data.tiktok).slice(0, 200)}</p>
                          </div>
                        )}
                      </>
                    )}
                    {searchResults.type === "hashtag" && searchResults.data?.instagram && (
                      <div className="bg-muted/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2"><Hash className="h-4 w-4 text-pink-400" /><span className="text-xs font-medium text-foreground">#{searchQuery}</span></div>
                        <p className="text-xs text-muted-foreground">{searchResults.data.instagram.top?.length || 0} top + {searchResults.data.instagram.recent?.length || 0} recent posts</p>
                      </div>
                    )}
                    {searchResults.type === "keyword" && searchResults.data?.tiktok?.data?.videos && (
                      <div className="space-y-1">
                        {searchResults.data.tiktok.data.videos.map((v: any) => (
                          <div key={v.id} className="bg-muted/30 rounded p-2 flex justify-between items-center">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-foreground truncate">{v.video_description || "No desc"}</p>
                              <div className="flex gap-2 text-[10px] text-muted-foreground"><span>@{v.username}</span><span>{(v.view_count || 0).toLocaleString()} views</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {searchResults.type === "content" && (
                      <div className="space-y-1">
                        {(searchResults.data?.posts || []).map((p: any) => (
                          <div key={p.id} className="bg-muted/30 rounded p-2">
                            <Badge variant="outline" className="text-[10px] mb-1">{p.post_type} · {p.status}</Badge>
                            <p className="text-xs text-foreground line-clamp-2">{p.caption}</p>
                          </div>
                        ))}
                        {(!searchResults.data?.posts?.length && !searchResults.data?.media?.length) && <p className="text-xs text-muted-foreground text-center py-3">No results. Pull media first.</p>}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}

              {/* Quick discovery */}
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground mb-2">Quick Discovery</p>
                <div className="flex gap-1.5 flex-wrap">
                  <Button size="sm" variant="outline" onClick={async () => { const d = await callApi("instagram-api", { action: "get_tagged_media", params: { limit: 25 } }); if (d) toast.success(`${d.data?.length || 0} tagged`); }} disabled={!igConnected || apiLoading} className="text-xs h-7"><AtSign className="h-3 w-3 mr-1" />Tagged</Button>
                  <Button size="sm" variant="outline" onClick={async () => { const d = await callApi("instagram-api", { action: "get_mentioned_media", params: { limit: 25 } }); if (d) toast.success(`${d.data?.length || 0} mentions`); }} disabled={!igConnected || apiLoading} className="text-xs h-7"><Megaphone className="h-3 w-3 mr-1" />Mentions</Button>
                  <Button size="sm" variant="outline" onClick={async () => { const d = await callApi("instagram-api", { action: "get_stories" }); if (d) toast.success(`${d.data?.length || 0} stories`); }} disabled={!igConnected || apiLoading} className="text-xs h-7"><Radio className="h-3 w-3 mr-1" />Stories</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== CONTENT ===== */}
        <TabsContent value="content" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Create Post</h4>
              <div className="grid grid-cols-2 gap-2">
                <select value={newPost.platform} onChange={e => setNewPost(p => ({ ...p, platform: e.target.value }))} className="bg-background border border-border text-foreground rounded-lg px-2 py-1.5 text-sm">
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                </select>
                <select value={newPost.post_type} onChange={e => setNewPost(p => ({ ...p, post_type: e.target.value }))} className="bg-background border border-border text-foreground rounded-lg px-2 py-1.5 text-sm">
                  <option value="feed">Photo</option>
                  <option value="reel">Reel</option>
                  <option value="story">Story</option>
                  <option value="carousel">Carousel</option>
                </select>
              </div>
              <Textarea value={newPost.caption} onChange={e => setNewPost(p => ({ ...p, caption: e.target.value }))} placeholder="Caption..." rows={3} className="text-sm" />
              <Input value={newPost.media_url} onChange={e => setNewPost(p => ({ ...p, media_url: e.target.value }))} placeholder="Media URL..." className="text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <Input type="datetime-local" value={newPost.scheduled_at} onChange={e => setNewPost(p => ({ ...p, scheduled_at: e.target.value }))} className="text-sm" />
                <Input value={newPost.redirect_url} onChange={e => setNewPost(p => ({ ...p, redirect_url: e.target.value }))} placeholder="Redirect URL" className="text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={newPost.auto_reply_enabled} onCheckedChange={v => setNewPost(p => ({ ...p, auto_reply_enabled: v }))} />
                <span className="text-xs text-muted-foreground">Auto-reply to comments</span>
              </div>
              {newPost.auto_reply_enabled && (
                <Input value={newPost.auto_reply_message} onChange={e => setNewPost(p => ({ ...p, auto_reply_message: e.target.value }))} placeholder="Auto-reply message..." className="text-sm" />
              )}
              <Button onClick={schedulePost} size="sm">{newPost.scheduled_at ? <><Calendar className="h-3.5 w-3.5 mr-1" />Schedule</> : <><Send className="h-3.5 w-3.5 mr-1" />Save Draft</>}</Button>
            </CardContent>
          </Card>

          {/* Posts list */}
          {posts.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-foreground mb-2">Posts ({posts.length})</h4>
                <ScrollArea className="max-h-[350px]">
                  <div className="space-y-2">
                    {posts.map(p => (
                      <div key={p.id} className="bg-muted/30 rounded-lg p-3 flex justify-between items-start">
                        <div className="flex-1 min-w-0 mr-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            {p.platform === "instagram" ? <Instagram className="h-3 w-3 text-pink-400" /> : <Music2 className="h-3 w-3 text-cyan-400" />}
                            <Badge variant="outline" className="text-[10px]">{p.post_type}</Badge>
                            <Badge className={`text-[10px] ${p.status === "published" ? "bg-green-500/15 text-green-400" : p.status === "scheduled" ? "bg-yellow-500/15 text-yellow-400" : "bg-muted text-muted-foreground"}`}>{p.status}</Badge>
                          </div>
                          <p className="text-xs text-foreground line-clamp-2">{p.caption || "No caption"}</p>
                          {p.scheduled_at && <p className="text-[10px] text-muted-foreground mt-1"><Clock className="h-2.5 w-2.5 inline mr-0.5" />{new Date(p.scheduled_at).toLocaleString()}</p>}
                        </div>
                        <div className="flex gap-1">
                          {p.status !== "published" && <Button size="sm" variant="ghost" onClick={() => publishPost(p)} className="h-7 w-7 p-0"><Send className="h-3 w-3" /></Button>}
                          <Button size="sm" variant="ghost" onClick={() => deletePost(p.id)} className="h-7 w-7 p-0 text-red-400"><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== ENGAGEMENT / COMMENTS ===== */}
        <TabsContent value="engagement" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Bot className="h-4 w-4 text-green-400" />Comment Manager + AI Bulk Reply</h4>
              <div className="flex gap-2">
                <select value={commentsPlatform} onChange={e => setCommentsPlatform(e.target.value)} className="bg-background border border-border text-foreground rounded-lg px-2 py-1.5 text-sm">
                  <option value="instagram">IG</option>
                  <option value="tiktok">TT</option>
                </select>
                <Input value={commentsMediaId} onChange={e => setCommentsMediaId(e.target.value)} placeholder="Media/Video ID" className="text-sm flex-1" />
                <Button size="sm" variant="outline" onClick={fetchComments} disabled={apiLoading}><MessageSquare className="h-3.5 w-3.5 mr-1" />Load</Button>
                <Button size="sm" onClick={bulkGenerateReplies} disabled={apiLoading || commentsList.length === 0}><Sparkles className="h-3.5 w-3.5 mr-1" />AI Reply All</Button>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Redirect link for AI replies</label>
                <Input value={aiAutoReplyRedirect} onChange={e => setAiAutoReplyRedirect(e.target.value)} placeholder="https://..." className="text-sm" />
              </div>

              {commentsList.length > 0 && <p className="text-xs text-muted-foreground">{commentsList.length} comments loaded</p>}

              {/* Individual comments */}
              {commentsList.length > 0 && !bulkAiReplies.length && (
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-1.5">
                    {commentsList.map((c: any, i: number) => (
                      <div key={i} className="bg-muted/30 rounded p-2">
                        <p className="text-xs text-muted-foreground">@{c.username || c.from?.username || "user"}</p>
                        <p className="text-xs text-foreground">{c.text}</p>
                        <div className="flex gap-1 mt-1">
                          <Input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Reply..." className="text-xs h-7 flex-1" />
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => replyToComment(c.id, c.text, c.username || c.from?.username)}><Send className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {/* Bulk AI replies */}
              {bulkAiReplies.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-foreground">{bulkAiReplies.length} AI replies ready</p>
                    <Button size="sm" onClick={sendAllBulkReplies}><Send className="h-3 w-3 mr-1" />Send All</Button>
                  </div>
                  <ScrollArea className="max-h-[300px]">
                    {bulkAiReplies.map((r, i) => (
                      <div key={i} className="bg-muted/30 rounded p-2 mb-1.5">
                        <p className="text-[10px] text-muted-foreground">@{r.username}: "{r.comment_text}"</p>
                        <p className="text-xs text-foreground mt-0.5">→ {r.generated_reply}</p>
                        <div className="flex gap-1 mt-1">
                          <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => sendBulkReply(r)}>Send</Button>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-red-400" onClick={() => setBulkAiReplies(p => p.filter(x => x.comment_id !== r.comment_id))}>Skip</Button>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
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
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={async () => { await callApi("instagram-api", { action: "get_account_insights", params: { period: "day" } }); toast.success("Updated"); loadData(); }} disabled={!igConnected || apiLoading}><Instagram className="h-3.5 w-3.5 mr-1" />Sync IG</Button>
            <Button size="sm" variant="outline" onClick={async () => { await callApi("tiktok-api", { action: "get_user_info" }); toast.success("Updated"); loadData(); }} disabled={!ttConnected || apiLoading}><Music2 className="h-3.5 w-3.5 mr-1" />Sync TT</Button>
          </div>
          {analytics.length > 0 ? (
            <Card>
              <CardContent className="p-4">
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-1.5">
                    {analytics.map(a => (
                      <div key={a.id} className="bg-muted/30 rounded p-2 flex justify-between items-center">
                        <div>
                          <p className="text-xs font-medium text-foreground">{a.metric_type}</p>
                          <p className="text-[10px] text-muted-foreground">{a.platform} · {new Date(a.fetched_at).toLocaleDateString()}</p>
                        </div>
                        <p className="text-sm font-bold text-foreground">{a.metric_value?.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="p-6 text-center"><BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" /><p className="text-xs text-muted-foreground">Sync platforms to see analytics</p></CardContent></Card>
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

        <TabsContent value="connect" className="space-y-4 mt-4">
          {/* Processing indicator */}
          {oauthProcessing && (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="p-4 flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-green-400 animate-spin" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Auto-connecting Instagram...</p>
                  <p className="text-xs text-muted-foreground">Fetching profile data and saving credentials</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* One-Click Automated OAuth Connection */}
          <Card className="border-primary/30">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                One-Click Instagram Connect
              </h4>
              <p className="text-xs text-muted-foreground">
                Click the button below — you'll be redirected to Meta to authorize, then automatically returned here with your account connected. No manual input needed.
              </p>
              <Input
                value={oauthAppId}
                onChange={e => {
                  setOauthAppId(e.target.value);
                  localStorage.setItem("meta_oauth_app_id", e.target.value);
                }}
                placeholder="Meta App ID (from developers.facebook.com)"
                className="text-sm"
              />
              <div className="flex gap-2 items-center flex-wrap">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  disabled={oauthProcessing}
                  onClick={() => {
                    if (!oauthAppId) { toast.error("Enter your Meta App ID first"); return; }
                    const scopes = [
                      "instagram_basic", "instagram_manage_messages", "instagram_manage_comments",
                      "instagram_manage_insights", "instagram_content_publish", "pages_show_list",
                      "pages_read_engagement", "business_management", "ads_read", "ads_management",
                      "instagram_shopping_tag_products", "instagram_manage_upcoming_events",
                      "instagram_branded_content_ads_brand", "instagram_branded_content_brand",
                      "catalog_management", "email", "public_profile",
                    ].join(",");
                    const redirectUri = window.location.origin + "/admin";
                    const authUrl = `https://www.facebook.com/v24.0/dialog/oauth?client_id=${oauthAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=token`;
                    // Full page redirect instead of popup — works in all environments
                    window.location.href = authUrl;
                  }}
                >
                  <Instagram className="h-4 w-4 mr-1.5" />
                  Connect Instagram
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-foreground"
                  disabled={oauthProcessing}
                  onClick={() => {
                    if (!oauthAppId) { toast.error("Enter your Meta App ID first"); return; }
                    const scopes = [
                      "instagram_basic", "instagram_manage_messages", "instagram_manage_comments",
                      "instagram_manage_insights", "instagram_content_publish", "pages_show_list",
                      "pages_read_engagement", "business_management", "ads_read", "ads_management",
                      "instagram_shopping_tag_products", "instagram_manage_upcoming_events",
                      "instagram_branded_content_ads_brand", "instagram_branded_content_brand",
                      "catalog_management", "email", "public_profile",
                    ].join(",");
                    const redirectUri = window.location.origin + "/admin";
                    const authUrl = `https://www.facebook.com/v24.0/dialog/oauth?client_id=${oauthAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=token`;
                    navigator.clipboard.writeText(authUrl);
                    window.open(authUrl, "_blank");
                    toast.success("Auth URL copied & opened in new tab. After authorizing, you'll be redirected back here.");
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-1.5" />
                  Open in New Tab
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">Requires a Meta App with Instagram permissions in Live mode. Get your App ID from <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" className="text-primary underline">developers.facebook.com</a></p>
            </CardContent>
          </Card>

          {/* Manual Connection */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Manual Connection</h4>
              <select value={connectForm.platform} onChange={e => setConnectForm(p => ({ ...p, platform: e.target.value }))} className="w-full bg-background border border-border text-foreground rounded-lg px-2 py-1.5 text-sm">
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
              </select>
              <Input value={connectForm.platform_username} onChange={e => setConnectForm(p => ({ ...p, platform_username: e.target.value }))} placeholder="Username" className="text-sm" />
              <Input value={connectForm.platform_user_id} onChange={e => setConnectForm(p => ({ ...p, platform_user_id: e.target.value }))} placeholder="User/Page ID" className="text-sm" />
              <Input value={connectForm.access_token} onChange={e => setConnectForm(p => ({ ...p, access_token: e.target.value }))} placeholder="Access Token" type="password" className="text-sm" />
              <Input value={connectForm.refresh_token} onChange={e => setConnectForm(p => ({ ...p, refresh_token: e.target.value }))} placeholder="Refresh Token (optional)" type="password" className="text-sm" />
              <Button onClick={connectPlatform} size="sm"><Plus className="h-3.5 w-3.5 mr-1" />Connect</Button>
            </CardContent>
          </Card>

          {connections.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-foreground mb-3">Connected Accounts</h4>
                <div className="space-y-3">
                  {connections.map(c => {
                    const meta = (c.metadata || {}) as any;
                    const profilePic = meta.profile_picture_url;
                    const name = meta.name || c.platform_username;
                    const followers = meta.followers_count;
                    const mediaCount = meta.media_count;
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
                            <div className={`absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full flex items-center justify-center ${c.platform === "instagram" ? "bg-gradient-to-br from-purple-500 to-pink-500" : "bg-black"}`}>
                              {c.platform === "instagram" ? <Instagram className="h-3 w-3 text-white" /> : <Music2 className="h-3 w-3 text-white" />}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-foreground truncate">{name}</p>
                              {c.is_connected && <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />}
                            </div>
                            <p className="text-xs text-muted-foreground">@{c.platform_username} · {c.platform}</p>
                            {(followers || mediaCount) && (
                              <div className="flex gap-3 mt-1">
                                {followers && <span className="text-xs text-muted-foreground"><Users className="h-3 w-3 inline mr-0.5" />{Number(followers).toLocaleString()}</span>}
                                {mediaCount && <span className="text-xs text-muted-foreground"><Image className="h-3 w-3 inline mr-0.5" />{Number(mediaCount).toLocaleString()}</span>}
                              </div>
                            )}
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
                          {c.token_expires_at && <><span>·</span><span>Token expires: {new Date(c.token_expires_at).toLocaleDateString()}</span></>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SocialMediaHub;

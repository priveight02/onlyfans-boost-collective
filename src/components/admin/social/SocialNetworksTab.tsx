import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Twitter, Globe, Phone, Music2, ChevronRight, RefreshCw, Calendar,
  MessageSquare, Send, Search, Users, Heart, Repeat, Bookmark,
  List, Radio, Eye, EyeOff, TrendingUp, Hash, Shield, Bot,
  Megaphone, FileText, Settings, Zap, Brain, Star, Target,
  ArrowUp, ArrowDown, Lock, Unlock, Pin, PinOff, UserPlus, UserMinus,
  Volume2, Image, Video, MapPin, Dice1, Forward, Copy, Trash2,
  Bell, BellOff, Link2, Upload, Play, BarChart3, Activity,
  FolderOpen, Award, Flag, Filter, Layers, Briefcase, Clock,
  Camera, MessageCircle, Smartphone, Youtube, Palette, Gamepad2,
  Instagram, AlertCircle,
} from "lucide-react";

interface Props {
  selectedAccount: string;
  onNavigateToConnect?: (platform: string) => void;
}

const SocialNetworksTab = ({ selectedAccount, onNavigateToConnect }: Props) => {
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const setInput = (key: string, val: string) => setInputValues(p => ({ ...p, [key]: val }));
  const getInput = (key: string) => inputValues[key] || "";

  useEffect(() => {
    if (!selectedAccount) return;
    const loadConnections = async () => {
      const { data } = await supabase.from("social_connections").select("platform, is_connected").eq("account_id", selectedAccount);
      setConnectedPlatforms((data || []).filter(c => c.is_connected).map(c => c.platform));
    };
    loadConnections();
    const channel = supabase
      .channel(`networks-conn-${selectedAccount}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "social_connections", filter: `account_id=eq.${selectedAccount}` }, () => loadConnections())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedAccount]);

  const isConnected = (platform: string) => connectedPlatforms.includes(platform);

  const handlePlatformClick = (platformId: string) => {
    if (!isConnected(platformId)) {
      toast.error(`${platformId} is not connected. Redirecting to Connect tab...`);
      onNavigateToConnect?.(platformId);
      return;
    }
    setExpandedPlatform(expandedPlatform === platformId ? null : platformId);
  };

  const callApi = async (funcName: string, action: string, params: any = {}) => {
    if (!selectedAccount) { toast.error("No account selected"); return null; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(funcName, {
        body: { action, account_id: selectedAccount, params },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "API call failed");
      setResult(data.data);
      toast.success(`${action} completed`);
      return data.data;
    } catch (e: any) {
      toast.error(e.message || "API error");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const platforms = [
    { id: "instagram", name: "Instagram", icon: Instagram, color: "text-pink-400", borderColor: "border-pink-500/30", bgColor: "bg-pink-500/10", funcName: "instagram-api" },
    { id: "twitter", name: "X / Twitter", icon: Twitter, color: "text-blue-400", borderColor: "border-blue-500/30", bgColor: "bg-blue-500/10", funcName: "twitter-api" },
    { id: "reddit", name: "Reddit", icon: Globe, color: "text-orange-400", borderColor: "border-orange-500/30", bgColor: "bg-orange-500/10", funcName: "reddit-api" },
    { id: "telegram", name: "Telegram", icon: Phone, color: "text-sky-400", borderColor: "border-sky-500/30", bgColor: "bg-sky-500/10", funcName: "telegram-api" },
    { id: "tiktok", name: "TikTok", icon: Music2, color: "text-cyan-400", borderColor: "border-cyan-500/30", bgColor: "bg-cyan-500/10", funcName: "tiktok-api" },
    { id: "snapchat", name: "Snapchat", icon: Camera, color: "text-yellow-400", borderColor: "border-yellow-500/30", bgColor: "bg-yellow-500/10", funcName: "snapchat-api" },
    { id: "threads", name: "Threads", icon: MessageCircle, color: "text-purple-400", borderColor: "border-purple-500/30", bgColor: "bg-purple-500/10", funcName: "threads-api" },
    { id: "whatsapp", name: "WhatsApp", icon: Smartphone, color: "text-green-400", borderColor: "border-green-500/30", bgColor: "bg-green-500/10", funcName: "whatsapp-api" },
    { id: "signal", name: "Signal", icon: Shield, color: "text-blue-300", borderColor: "border-blue-300/30", bgColor: "bg-blue-300/10", funcName: "signal-api" },
    { id: "youtube", name: "YouTube", icon: Youtube, color: "text-red-400", borderColor: "border-red-500/30", bgColor: "bg-red-500/10", funcName: "youtube-api" },
    { id: "pinterest", name: "Pinterest", icon: Palette, color: "text-rose-400", borderColor: "border-rose-500/30", bgColor: "bg-rose-500/10", funcName: "pinterest-api" },
    { id: "discord", name: "Discord", icon: Gamepad2, color: "text-indigo-400", borderColor: "border-indigo-500/30", bgColor: "bg-indigo-500/10", funcName: "discord-api" },
    { id: "facebook", name: "Facebook", icon: Globe, color: "text-blue-500", borderColor: "border-blue-600/30", bgColor: "bg-blue-600/10", funcName: "facebook-api" },
  ];

  const renderActionButton = (label: string, funcName: string, action: string, params: any = {}, icon?: any) => {
    const Icon = icon || Zap;
    return (
      <Button size="sm" variant="outline" onClick={() => callApi(funcName, action, params)} disabled={loading} className="text-xs h-8 gap-1 text-foreground">
        <Icon className="h-3 w-3" />{label}
      </Button>
    );
  };

  const renderInputAction = (label: string, funcName: string, action: string, inputKeys: { key: string; placeholder: string; type?: string }[], buildParams: () => any, icon?: any) => {
    const Icon = icon || Send;
    return (
      <div className="space-y-1.5 p-2 bg-muted/20 rounded-lg border border-border/50">
        <p className="text-[10px] font-semibold text-foreground uppercase tracking-wider">{label}</p>
        <div className="flex gap-1.5 flex-wrap">
          {inputKeys.map(ik => (
            <Input key={ik.key} value={getInput(ik.key)} onChange={e => setInput(ik.key, e.target.value)} placeholder={ik.placeholder} type={ik.type || "text"} className="text-xs h-7 flex-1 min-w-[120px]" />
          ))}
          <Button size="sm" variant="default" onClick={() => callApi(funcName, action, buildParams())} disabled={loading} className="text-xs h-7 gap-1 text-primary-foreground">
            {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />}Go
          </Button>
        </div>
      </div>
    );
  };

  // ===== INSTAGRAM =====
  const renderInstagramContent = () => (
    <Tabs defaultValue="media" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[{v:"media",l:"Media",icon:Image},{v:"publish",l:"Publish",icon:Upload},{v:"stories",l:"Stories",icon:Play},{v:"comments",l:"Comments",icon:MessageSquare},{v:"dms",l:"DMs",icon:Send},{v:"insights",l:"Insights",icon:BarChart3},{v:"discovery",l:"Discovery",icon:Search},{v:"hashtags",l:"Hashtags",icon:Hash},{v:"ai",l:"AI Auto",icon:Brain}].map(t=>(
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background"><t.icon className="h-3 w-3"/>{t.l}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="media" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("Profile","instagram-api","get_profile",{},Users)}
          {renderActionButton("My Media","instagram-api","get_media",{limit:25},Image)}
          {renderActionButton("Stories","instagram-api","get_stories",{},Play)}
        </div>
        {renderInputAction("Get Media","instagram-api","get_media_by_id",[{key:"ig_media_id",placeholder:"Media ID"}],()=>({media_id:getInput("ig_media_id")}),Eye)}
        {renderInputAction("Children (Carousel)","instagram-api","get_media_children",[{key:"ig_carousel_id",placeholder:"Carousel ID"}],()=>({media_id:getInput("ig_carousel_id")}),Layers)}
      </TabsContent>
      <TabsContent value="publish" className="space-y-2 mt-3">
        {renderInputAction("Photo Post","instagram-api","create_photo_post",[{key:"ig_ph_url",placeholder:"Image URL"},{key:"ig_ph_cap",placeholder:"Caption"}],()=>({image_url:getInput("ig_ph_url"),caption:getInput("ig_ph_cap")}),Image)}
        {renderInputAction("Carousel Post","instagram-api","create_carousel_post",[{key:"ig_car_urls",placeholder:"Image URLs (comma sep)"},{key:"ig_car_cap",placeholder:"Caption"}],()=>({image_urls:getInput("ig_car_urls").split(",").map(s=>s.trim()),caption:getInput("ig_car_cap")}),Layers)}
        {renderInputAction("Reel","instagram-api","create_reel",[{key:"ig_reel_url",placeholder:"Video URL"},{key:"ig_reel_cap",placeholder:"Caption"},{key:"ig_reel_cover",placeholder:"Cover URL (optional)"}],()=>({video_url:getInput("ig_reel_url"),caption:getInput("ig_reel_cap"),cover_url:getInput("ig_reel_cover")}),Video)}
        {renderInputAction("Story (Image)","instagram-api","create_story",[{key:"ig_st_url",placeholder:"Image URL"}],()=>({image_url:getInput("ig_st_url")}),Play)}
        {renderInputAction("Story (Video)","instagram-api","create_video_story",[{key:"ig_stv_url",placeholder:"Video URL"}],()=>({video_url:getInput("ig_stv_url")}),Video)}
      </TabsContent>
      <TabsContent value="stories" className="space-y-2 mt-3">
        {renderActionButton("My Stories","instagram-api","get_stories",{},Play)}
        {renderInputAction("Story Insights","instagram-api","get_story_insights",[{key:"ig_si_id",placeholder:"Story ID"}],()=>({story_id:getInput("ig_si_id")}),BarChart3)}
      </TabsContent>
      <TabsContent value="comments" className="space-y-2 mt-3">
        {renderInputAction("Get Comments","instagram-api","get_comments",[{key:"ig_cmt_media",placeholder:"Media ID"}],()=>({media_id:getInput("ig_cmt_media"),limit:50}),MessageSquare)}
        {renderInputAction("Reply","instagram-api","reply_to_comment",[{key:"ig_rply_cmt",placeholder:"Comment ID"},{key:"ig_rply_text",placeholder:"Reply..."}],()=>({comment_id:getInput("ig_rply_cmt"),message:getInput("ig_rply_text")}),Send)}
        {renderInputAction("Delete Comment","instagram-api","delete_comment",[{key:"ig_del_cmt",placeholder:"Comment ID"}],()=>({comment_id:getInput("ig_del_cmt")}),Trash2)}
        {renderInputAction("Hide Comment","instagram-api","hide_comment",[{key:"ig_hide_cmt",placeholder:"Comment ID"}],()=>({comment_id:getInput("ig_hide_cmt")}),EyeOff)}
      </TabsContent>
      <TabsContent value="dms" className="space-y-2 mt-3">
        {renderActionButton("Conversations","instagram-api","get_conversations",{limit:20},MessageSquare)}
        {renderInputAction("Get Messages","instagram-api","get_messages",[{key:"ig_conv_id",placeholder:"Conversation ID"}],()=>({conversation_id:getInput("ig_conv_id")}),MessageSquare)}
        {renderInputAction("Send DM","instagram-api","send_dm",[{key:"ig_dm_to",placeholder:"Recipient ID"},{key:"ig_dm_text",placeholder:"Message..."}],()=>({recipient_id:getInput("ig_dm_to"),message:getInput("ig_dm_text")}),Send)}
        {renderInputAction("Send Image DM","instagram-api","send_dm_image",[{key:"ig_dmi_to",placeholder:"Recipient ID"},{key:"ig_dmi_url",placeholder:"Image URL"}],()=>({recipient_id:getInput("ig_dmi_to"),image_url:getInput("ig_dmi_url")}),Image)}
      </TabsContent>
      <TabsContent value="insights" className="space-y-2 mt-3">
        {renderActionButton("Account Insights","instagram-api","get_account_insights",{period:"day"},BarChart3)}
        {renderInputAction("Media Insights","instagram-api","get_media_insights",[{key:"ig_mi_id",placeholder:"Media ID"}],()=>({media_id:getInput("ig_mi_id")}),BarChart3)}
        {renderActionButton("Audience","instagram-api","get_audience_insights",{},Users)}
        {renderActionButton("Online Followers","instagram-api","get_online_followers",{},Clock)}
      </TabsContent>
      <TabsContent value="discovery" className="space-y-2 mt-3">
        {renderInputAction("Discover User","instagram-api","discover_user",[{key:"ig_disc_user",placeholder:"@username"}],()=>({username:getInput("ig_disc_user")}),Search)}
        {renderInputAction("User Media","instagram-api","discover_user_media",[{key:"ig_disc_uid",placeholder:"User ID"}],()=>({user_id:getInput("ig_disc_uid"),limit:12}),Image)}
        {renderInputAction("Hashtag Search","instagram-api","search_hashtag",[{key:"ig_ht_q",placeholder:"Hashtag (no #)"}],()=>({hashtag:getInput("ig_ht_q")}),Hash)}
      </TabsContent>
      <TabsContent value="hashtags" className="space-y-2 mt-3">
        {renderInputAction("Hashtag ID","instagram-api","search_hashtag",[{key:"ig_htid_q",placeholder:"Hashtag"}],()=>({hashtag:getInput("ig_htid_q")}),Hash)}
        {renderInputAction("Top Media","instagram-api","get_hashtag_top_media",[{key:"ig_ht_top_id",placeholder:"Hashtag ID"}],()=>({hashtag_id:getInput("ig_ht_top_id")}),TrendingUp)}
        {renderInputAction("Recent Media","instagram-api","get_hashtag_recent_media",[{key:"ig_ht_rec_id",placeholder:"Hashtag ID"}],()=>({hashtag_id:getInput("ig_ht_rec_id")}),Clock)}
      </TabsContent>
      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Caption","social-ai-responder","generate_caption",[{key:"ai_ig_topic",placeholder:"Topic"}],()=>({topic:getInput("ai_ig_topic"),platform:"instagram",include_cta:true}),Brain)}
        {renderInputAction("AI DM Reply","social-ai-responder","generate_dm_reply",[{key:"ai_ig_dm",placeholder:"Incoming DM text..."}],()=>({message_text:getInput("ai_ig_dm"),sender_name:"fan"}),Zap)}
        {renderInputAction("AI Comment Reply","social-ai-responder","generate_dm_reply",[{key:"ai_ig_cmt_text",placeholder:"Comment text..."}],()=>({message_text:getInput("ai_ig_cmt_text"),sender_name:"commenter"}),MessageSquare)}
        {renderInputAction("AI Hashtag Gen","social-ai-responder","generate_caption",[{key:"ai_ig_ht_topic",placeholder:"Niche/Topic for hashtags"}],()=>({topic:`Generate 30 relevant hashtags for: ${getInput("ai_ig_ht_topic")}`,platform:"instagram",include_cta:false}),Hash)}
        {renderInputAction("AI Bio Writer","social-ai-responder","generate_caption",[{key:"ai_ig_bio_topic",placeholder:"Describe your brand/niche"}],()=>({topic:`Write a compelling Instagram bio for: ${getInput("ai_ig_bio_topic")}`,platform:"instagram",include_cta:false}),Users)}
        {renderInputAction("AI Story Ideas","social-ai-responder","generate_caption",[{key:"ai_ig_story_topic",placeholder:"Topic for stories"}],()=>({topic:`Generate 10 Instagram story ideas for: ${getInput("ai_ig_story_topic")}`,platform:"instagram",include_cta:false}),Play)}
      </TabsContent>
    </Tabs>
  );

  // ===== TWITTER =====
  const renderTwitterContent = () => (
    <Tabs defaultValue="tweets" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[{v:"tweets",l:"Tweets",icon:MessageSquare},{v:"engage",l:"Engage",icon:Heart},{v:"social",l:"Social",icon:Users},{v:"dms",l:"DMs",icon:Send},{v:"lists",l:"Lists",icon:List},{v:"search",l:"Search",icon:Search},{v:"spaces",l:"Spaces",icon:Radio},{v:"ai",l:"AI Auto",icon:Brain}].map(t=>(
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background"><t.icon className="h-3 w-3"/>{t.l}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="tweets" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("My Tweets","twitter-api","get_tweets",{limit:20},MessageSquare)}
          {renderActionButton("Timeline","twitter-api","get_home_timeline",{limit:20},Layers)}
          {renderActionButton("Mentions","twitter-api","get_mentions",{limit:20},Bell)}
        </div>
        {renderInputAction("Create Tweet","twitter-api","create_tweet",[{key:"tweet_text",placeholder:"What's happening?"}],()=>({text:getInput("tweet_text")}),Send)}
        {renderInputAction("Reply","twitter-api","create_tweet",[{key:"reply_to_id",placeholder:"Tweet ID"},{key:"reply_text",placeholder:"Reply..."}],()=>({text:getInput("reply_text"),reply_to:getInput("reply_to_id")}),MessageSquare)}
        {renderInputAction("Quote","twitter-api","create_tweet",[{key:"qt_id",placeholder:"Tweet ID"},{key:"qt_text",placeholder:"Comment..."}],()=>({text:getInput("qt_text"),quote_tweet_id:getInput("qt_id")}),Repeat)}
        {renderInputAction("Delete","twitter-api","delete_tweet",[{key:"del_tweet_id",placeholder:"Tweet ID"}],()=>({tweet_id:getInput("del_tweet_id")}),Trash2)}
        {renderInputAction("Get Tweet","twitter-api","get_tweet_by_id",[{key:"view_tweet_id",placeholder:"Tweet ID"}],()=>({tweet_id:getInput("view_tweet_id")}),Eye)}
        {renderInputAction("Hide Reply","twitter-api","hide_reply",[{key:"hide_tweet_id",placeholder:"Tweet ID"}],()=>({tweet_id:getInput("hide_tweet_id")}),EyeOff)}
      </TabsContent>
      <TabsContent value="engage" className="space-y-2 mt-3">
        {renderInputAction("Like","twitter-api","like_tweet",[{key:"like_id",placeholder:"Tweet ID"}],()=>({tweet_id:getInput("like_id")}),Heart)}
        {renderInputAction("Unlike","twitter-api","unlike_tweet",[{key:"unlike_id",placeholder:"Tweet ID"}],()=>({tweet_id:getInput("unlike_id")}),Heart)}
        {renderInputAction("Retweet","twitter-api","retweet",[{key:"rt_id",placeholder:"Tweet ID"}],()=>({tweet_id:getInput("rt_id")}),Repeat)}
        {renderInputAction("Bookmark","twitter-api","bookmark_tweet",[{key:"bm_id",placeholder:"Tweet ID"}],()=>({tweet_id:getInput("bm_id")}),Bookmark)}
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("My Likes","twitter-api","get_liked_tweets",{limit:20},Heart)}
          {renderActionButton("Bookmarks","twitter-api","get_bookmarks",{limit:20},Bookmark)}
        </div>
      </TabsContent>
      <TabsContent value="social" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("Profile","twitter-api","get_profile",{},Users)}
          {renderActionButton("Followers","twitter-api","get_followers",{limit:100},Users)}
          {renderActionButton("Following","twitter-api","get_following",{limit:100},UserPlus)}
          {renderActionButton("Blocked","twitter-api","get_blocked_users",{limit:100},Shield)}
        </div>
        {renderInputAction("Lookup User","twitter-api","get_user_by_username",[{key:"x_lookup",placeholder:"Username"}],()=>({username:getInput("x_lookup")}),Search)}
        {renderInputAction("Follow","twitter-api","follow_user",[{key:"follow_uid",placeholder:"User ID"}],()=>({target_user_id:getInput("follow_uid")}),UserPlus)}
        {renderInputAction("Block","twitter-api","block_user",[{key:"block_uid",placeholder:"User ID"}],()=>({target_user_id:getInput("block_uid")}),Shield)}
      </TabsContent>
      <TabsContent value="dms" className="space-y-2 mt-3">
        {renderActionButton("DM Events","twitter-api","get_dm_events",{limit:20},MessageSquare)}
        {renderInputAction("Send DM","twitter-api","send_dm",[{key:"dm_to",placeholder:"User ID"},{key:"dm_text",placeholder:"Message..."}],()=>({recipient_id:getInput("dm_to"),text:getInput("dm_text")}),Send)}
      </TabsContent>
      <TabsContent value="lists" className="space-y-2 mt-3">
        {renderActionButton("My Lists","twitter-api","get_owned_lists",{limit:25},List)}
        {renderInputAction("Create List","twitter-api","create_list",[{key:"list_name",placeholder:"Name"},{key:"list_desc",placeholder:"Description"}],()=>({name:getInput("list_name"),description:getInput("list_desc")}),List)}
      </TabsContent>
      <TabsContent value="search" className="space-y-2 mt-3">
        {renderInputAction("Search Tweets","twitter-api","search",[{key:"x_search_q",placeholder:"Query..."}],()=>({query:getInput("x_search_q"),limit:20}),Search)}
        {renderInputAction("Search Users","twitter-api","search_users",[{key:"x_user_search",placeholder:"Search..."}],()=>({query:getInput("x_user_search"),limit:10}),Users)}
      </TabsContent>
      <TabsContent value="spaces" className="space-y-2 mt-3">
        {renderInputAction("Get Space","twitter-api","get_space",[{key:"space_id",placeholder:"Space ID"}],()=>({space_id:getInput("space_id")}),Radio)}
        {renderInputAction("Search Spaces","twitter-api","search_spaces",[{key:"space_query",placeholder:"Query"}],()=>({query:getInput("space_query"),state:"live"}),Search)}
      </TabsContent>
      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Tweet","social-ai-responder","generate_caption",[{key:"ai_x_topic",placeholder:"Topic/niche"}],()=>({topic:getInput("ai_x_topic"),platform:"twitter",include_cta:true}),Brain)}
        {renderInputAction("AI Reply","social-ai-responder","generate_dm_reply",[{key:"ai_x_mention",placeholder:"Mention text..."}],()=>({message_text:getInput("ai_x_mention"),sender_name:"mention"}),Zap)}
        {renderInputAction("AI DM Auto-Reply","social-ai-responder","generate_dm_reply",[{key:"ai_x_dm",placeholder:"Incoming DM text..."}],()=>({message_text:getInput("ai_x_dm"),sender_name:"follower"}),Send)}
        {renderInputAction("AI Thread Writer","social-ai-responder","generate_caption",[{key:"ai_x_thread",placeholder:"Topic for thread (10 tweets)"}],()=>({topic:`Write a viral Twitter/X thread (10 tweets) about: ${getInput("ai_x_thread")}`,platform:"twitter",include_cta:true}),Layers)}
        {renderInputAction("AI Hashtag Gen","social-ai-responder","generate_caption",[{key:"ai_x_ht",placeholder:"Niche/topic"}],()=>({topic:`Generate 15 trending Twitter hashtags for: ${getInput("ai_x_ht")}`,platform:"twitter",include_cta:false}),Hash)}
        {renderInputAction("AI Bio Writer","social-ai-responder","generate_caption",[{key:"ai_x_bio",placeholder:"Describe your brand"}],()=>({topic:`Write a compelling X/Twitter bio (160 chars) for: ${getInput("ai_x_bio")}`,platform:"twitter",include_cta:false}),Users)}
        {renderInputAction("AI Engagement Bait","social-ai-responder","generate_caption",[{key:"ai_x_engage",placeholder:"Niche"}],()=>({topic:`Write 5 high-engagement tweet ideas (polls, questions, hot takes) for: ${getInput("ai_x_engage")}`,platform:"twitter",include_cta:false}),TrendingUp)}
        {renderInputAction("AI Content Calendar","social-ai-responder","generate_caption",[{key:"ai_x_cal",placeholder:"Niche for 7-day plan"}],()=>({topic:`Create a 7-day Twitter content calendar with tweet ideas for: ${getInput("ai_x_cal")}`,platform:"twitter",include_cta:false}),Calendar)}
      </TabsContent>
    </Tabs>
  );

  // ===== REDDIT =====
  const renderRedditContent = () => (
    <Tabs defaultValue="posts" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[{v:"posts",l:"Posts",icon:FileText},{v:"comments",l:"Comments",icon:MessageSquare},{v:"subs",l:"Subreddits",icon:Hash},{v:"messages",l:"Messages",icon:Send},{v:"mod",l:"Mod",icon:Shield},{v:"profile",l:"Profile",icon:Users},{v:"search",l:"Search",icon:Search},{v:"ai",l:"AI",icon:Brain}].map(t=>(
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background"><t.icon className="h-3 w-3"/>{t.l}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="posts" className="space-y-2 mt-3">
        {renderActionButton("My Posts","reddit-api","get_posts",{limit:25},FileText)}
        {renderInputAction("Submit Text","reddit-api","submit_post",[{key:"r_sub",placeholder:"Subreddit"},{key:"r_title",placeholder:"Title"},{key:"r_text",placeholder:"Body"}],()=>({subreddit:getInput("r_sub"),title:getInput("r_title"),text:getInput("r_text"),kind:"self"}),Send)}
        {renderInputAction("Submit Link","reddit-api","submit_post",[{key:"r_link_sub",placeholder:"Subreddit"},{key:"r_link_title",placeholder:"Title"},{key:"r_link_url",placeholder:"URL"}],()=>({subreddit:getInput("r_link_sub"),title:getInput("r_link_title"),url:getInput("r_link_url"),kind:"link"}),Link2)}
        {renderInputAction("Vote","reddit-api","vote",[{key:"r_vote_id",placeholder:"Thing ID"},{key:"r_vote_dir",placeholder:"1/-1/0"}],()=>({thing_id:getInput("r_vote_id"),direction:parseInt(getInput("r_vote_dir")||"1")}),ArrowUp)}
      </TabsContent>
      <TabsContent value="comments" className="space-y-2 mt-3">
        {renderInputAction("Comments","reddit-api","get_comments",[{key:"r_cmt_post",placeholder:"Post ID"}],()=>({post_id:getInput("r_cmt_post"),limit:50}),MessageSquare)}
        {renderInputAction("Reply","reddit-api","submit_comment",[{key:"r_reply_id",placeholder:"Thing ID"},{key:"r_reply_text",placeholder:"Reply..."}],()=>({thing_id:getInput("r_reply_id"),text:getInput("r_reply_text")}),Send)}
      </TabsContent>
      <TabsContent value="subs" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("My Subs","reddit-api","get_my_subreddits",{limit:25},Hash)}
          {renderActionButton("Popular","reddit-api","get_popular_subreddits",{limit:25},TrendingUp)}
        </div>
        {renderInputAction("Hot Posts","reddit-api","get_subreddit_hot",[{key:"r_hot_sub",placeholder:"Subreddit"}],()=>({subreddit:getInput("r_hot_sub"),limit:25}),TrendingUp)}
        {renderInputAction("Subscribe","reddit-api","subscribe",[{key:"r_sub_join",placeholder:"Subreddit"}],()=>({subreddit:getInput("r_sub_join")}),UserPlus)}
      </TabsContent>
      <TabsContent value="messages" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("Inbox","reddit-api","get_inbox",{limit:25},Send)}
          {renderActionButton("Unread","reddit-api","get_unread",{limit:25},Bell)}
        </div>
        {renderInputAction("Send Message","reddit-api","send_message",[{key:"r_msg_to",placeholder:"Username"},{key:"r_msg_subj",placeholder:"Subject"},{key:"r_msg_text",placeholder:"Body"}],()=>({to:getInput("r_msg_to"),subject:getInput("r_msg_subj"),text:getInput("r_msg_text")}),Send)}
      </TabsContent>
      <TabsContent value="mod" className="space-y-2 mt-3">
        {renderInputAction("Mod Queue","reddit-api","get_modqueue",[{key:"r_mq_sub",placeholder:"Subreddit"}],()=>({subreddit:getInput("r_mq_sub"),limit:25}),Filter)}
        {renderInputAction("Approve","reddit-api","approve",[{key:"r_appr_id",placeholder:"Thing ID"}],()=>({thing_id:getInput("r_appr_id")}),Zap)}
        {renderInputAction("Remove","reddit-api","remove",[{key:"r_rem_id",placeholder:"Thing ID"}],()=>({thing_id:getInput("r_rem_id")}),Trash2)}
        {renderInputAction("Lock","reddit-api","lock",[{key:"r_lock_id",placeholder:"Thing ID"}],()=>({thing_id:getInput("r_lock_id")}),Lock)}
      </TabsContent>
      <TabsContent value="profile" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("Profile","reddit-api","get_profile",{},Users)}
          {renderActionButton("Karma","reddit-api","get_karma",{},ArrowUp)}
          {renderActionButton("Trophies","reddit-api","get_trophies",{},Award)}
        </div>
      </TabsContent>
      <TabsContent value="search" className="space-y-2 mt-3">
        {renderInputAction("Search","reddit-api","search",[{key:"r_search_q",placeholder:"Query"}],()=>({query:getInput("r_search_q"),limit:25}),Search)}
      </TabsContent>
      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Post","social-ai-responder","generate_caption",[{key:"ai_r_topic",placeholder:"Topic"}],()=>({topic:getInput("ai_r_topic"),platform:"reddit",include_cta:true}),Brain)}
        {renderInputAction("AI Comment Reply","social-ai-responder","generate_dm_reply",[{key:"ai_r_cmt",placeholder:"Comment to reply to..."}],()=>({message_text:getInput("ai_r_cmt"),sender_name:"redditor"}),MessageSquare)}
        {renderInputAction("AI Title Generator","social-ai-responder","generate_caption",[{key:"ai_r_title",placeholder:"Content/topic for title"}],()=>({topic:`Generate 5 click-worthy Reddit post titles for: ${getInput("ai_r_title")}`,platform:"reddit",include_cta:false}),FileText)}
        {renderInputAction("AI Subreddit Finder","social-ai-responder","generate_caption",[{key:"ai_r_sub",placeholder:"Describe your niche"}],()=>({topic:`List 15 best subreddits to promote content about: ${getInput("ai_r_sub")}`,platform:"reddit",include_cta:false}),Search)}
        {renderInputAction("AI DM Auto-Reply","social-ai-responder","generate_dm_reply",[{key:"ai_r_dm",placeholder:"Incoming DM text..."}],()=>({message_text:getInput("ai_r_dm"),sender_name:"user"}),Send)}
        {renderInputAction("AI AMA Generator","social-ai-responder","generate_caption",[{key:"ai_r_ama",placeholder:"Your expertise/niche"}],()=>({topic:`Write an AMA (Ask Me Anything) post intro and 10 expected Q&A pairs for: ${getInput("ai_r_ama")}`,platform:"reddit",include_cta:false}),Star)}
      </TabsContent>
    </Tabs>
  );

  // ===== TELEGRAM =====
  const renderTelegramContent = () => (
    <Tabs defaultValue="messages" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[{v:"messages",l:"Messages",icon:Send},{v:"media",l:"Media",icon:Image},{v:"chat",l:"Chat",icon:Settings},{v:"members",l:"Members",icon:Users},{v:"bot",l:"Bot",icon:Bot},{v:"forum",l:"Forum",icon:Layers},{v:"ai",l:"AI",icon:Brain}].map(t=>(
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background"><t.icon className="h-3 w-3"/>{t.l}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="messages" className="space-y-2 mt-3">
        {renderInputAction("Send Text","telegram-api","send_message",[{key:"tg_chat_id",placeholder:"Chat ID"},{key:"tg_text",placeholder:"Message"}],()=>({chat_id:getInput("tg_chat_id"),text:getInput("tg_text")}),Send)}
        {renderInputAction("Forward","telegram-api","forward_message",[{key:"tg_fw_to",placeholder:"To Chat"},{key:"tg_fw_from",placeholder:"From Chat"},{key:"tg_fw_msg",placeholder:"Msg ID"}],()=>({chat_id:getInput("tg_fw_to"),from_chat_id:getInput("tg_fw_from"),message_id:parseInt(getInput("tg_fw_msg"))}),Forward)}
        {renderInputAction("Edit","telegram-api","edit_message_text",[{key:"tg_edit_chat",placeholder:"Chat ID"},{key:"tg_edit_msg",placeholder:"Msg ID"},{key:"tg_edit_text",placeholder:"New text"}],()=>({chat_id:getInput("tg_edit_chat"),message_id:parseInt(getInput("tg_edit_msg")),text:getInput("tg_edit_text")}),FileText)}
        {renderInputAction("Delete","telegram-api","delete_message",[{key:"tg_del_chat",placeholder:"Chat ID"},{key:"tg_del_msg",placeholder:"Msg ID"}],()=>({chat_id:getInput("tg_del_chat"),message_id:parseInt(getInput("tg_del_msg"))}),Trash2)}
        {renderInputAction("Poll","telegram-api","send_poll",[{key:"tg_poll_chat",placeholder:"Chat ID"},{key:"tg_poll_q",placeholder:"Question"},{key:"tg_poll_opts",placeholder:"Options (comma sep)"}],()=>({chat_id:getInput("tg_poll_chat"),question:getInput("tg_poll_q"),options:getInput("tg_poll_opts").split(",").map(s=>s.trim()).filter(Boolean)}),BarChart3)}
      </TabsContent>
      <TabsContent value="media" className="space-y-2 mt-3">
        {renderInputAction("Photo","telegram-api","send_photo",[{key:"tg_ph_chat",placeholder:"Chat ID"},{key:"tg_ph_url",placeholder:"URL"},{key:"tg_ph_cap",placeholder:"Caption"}],()=>({chat_id:getInput("tg_ph_chat"),photo_url:getInput("tg_ph_url"),caption:getInput("tg_ph_cap")}),Image)}
        {renderInputAction("Video","telegram-api","send_video",[{key:"tg_vid_chat",placeholder:"Chat ID"},{key:"tg_vid_url",placeholder:"URL"},{key:"tg_vid_cap",placeholder:"Caption"}],()=>({chat_id:getInput("tg_vid_chat"),video_url:getInput("tg_vid_url"),caption:getInput("tg_vid_cap")}),Video)}
        {renderInputAction("Document","telegram-api","send_document",[{key:"tg_doc_chat",placeholder:"Chat ID"},{key:"tg_doc_url",placeholder:"URL"}],()=>({chat_id:getInput("tg_doc_chat"),document_url:getInput("tg_doc_url")}),FileText)}
        {renderInputAction("Location","telegram-api","send_location",[{key:"tg_loc_chat",placeholder:"Chat ID"},{key:"tg_loc_lat",placeholder:"Lat"},{key:"tg_loc_lng",placeholder:"Lng"}],()=>({chat_id:getInput("tg_loc_chat"),latitude:parseFloat(getInput("tg_loc_lat")),longitude:parseFloat(getInput("tg_loc_lng"))}),MapPin)}
      </TabsContent>
      <TabsContent value="chat" className="space-y-2 mt-3">
        {renderActionButton("Bot Info","telegram-api","get_me",{},Bot)}
        {renderInputAction("Get Chat","telegram-api","get_chat",[{key:"tg_gc_id",placeholder:"Chat ID"}],()=>({chat_id:getInput("tg_gc_id")}),MessageSquare)}
        {renderInputAction("Set Title","telegram-api","set_chat_title",[{key:"tg_st_chat",placeholder:"Chat ID"},{key:"tg_st_title",placeholder:"Title"}],()=>({chat_id:getInput("tg_st_chat"),title:getInput("tg_st_title")}),FileText)}
        {renderInputAction("Invite Link","telegram-api","create_chat_invite_link",[{key:"tg_inv_chat",placeholder:"Chat ID"}],()=>({chat_id:getInput("tg_inv_chat")}),Link2)}
      </TabsContent>
      <TabsContent value="members" className="space-y-2 mt-3">
        {renderInputAction("Ban","telegram-api","ban_chat_member",[{key:"tg_ban_chat",placeholder:"Chat ID"},{key:"tg_ban_user",placeholder:"User ID"}],()=>({chat_id:getInput("tg_ban_chat"),user_id:parseInt(getInput("tg_ban_user"))}),Shield)}
        {renderInputAction("Unban","telegram-api","unban_chat_member",[{key:"tg_unban_chat",placeholder:"Chat ID"},{key:"tg_unban_user",placeholder:"User ID"}],()=>({chat_id:getInput("tg_unban_chat"),user_id:parseInt(getInput("tg_unban_user"))}),UserPlus)}
        {renderInputAction("Promote","telegram-api","promote_chat_member",[{key:"tg_promo_chat",placeholder:"Chat ID"},{key:"tg_promo_user",placeholder:"User ID"}],()=>({chat_id:getInput("tg_promo_chat"),user_id:parseInt(getInput("tg_promo_user")),can_manage_chat:true,can_delete_messages:true}),ArrowUp)}
      </TabsContent>
      <TabsContent value="bot" className="space-y-2 mt-3">
        {renderActionButton("Bot Info","telegram-api","get_me",{},Bot)}
        {renderActionButton("Commands","telegram-api","get_my_commands",{},Briefcase)}
        {renderInputAction("Set Commands","telegram-api","set_my_commands",[{key:"tg_cmd_json",placeholder:'[{"command":"start","description":"..."}]'}],()=>({commands:JSON.parse(getInput("tg_cmd_json")||"[]")}),Settings)}
      </TabsContent>
      <TabsContent value="forum" className="space-y-2 mt-3">
        {renderInputAction("Create Topic","telegram-api","create_forum_topic",[{key:"tg_ft_chat",placeholder:"Chat ID"},{key:"tg_ft_name",placeholder:"Topic name"}],()=>({chat_id:getInput("tg_ft_chat"),name:getInput("tg_ft_name")}),FolderOpen)}
        {renderInputAction("Close Topic","telegram-api","close_forum_topic",[{key:"tg_cft_chat",placeholder:"Chat ID"},{key:"tg_cft_thread",placeholder:"Thread ID"}],()=>({chat_id:getInput("tg_cft_chat"),message_thread_id:parseInt(getInput("tg_cft_thread"))}),Lock)}
      </TabsContent>
      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Message","social-ai-responder","generate_caption",[{key:"ai_tg_topic",placeholder:"Topic"}],()=>({topic:getInput("ai_tg_topic"),platform:"telegram",include_cta:true}),Brain)}
        {renderInputAction("AI Auto-Reply","social-ai-responder","generate_dm_reply",[{key:"ai_tg_dm",placeholder:"Incoming message..."}],()=>({message_text:getInput("ai_tg_dm"),sender_name:"subscriber"}),Zap)}
        {renderInputAction("AI Channel Post","social-ai-responder","generate_caption",[{key:"ai_tg_ch",placeholder:"Topic for channel post"}],()=>({topic:`Write a Telegram channel post (formatted with bold and links) about: ${getInput("ai_tg_ch")}`,platform:"telegram",include_cta:true}),Megaphone)}
        {renderInputAction("AI Poll Creator","social-ai-responder","generate_caption",[{key:"ai_tg_poll",placeholder:"Topic for poll"}],()=>({topic:`Create 5 engaging Telegram poll questions with 4 options each about: ${getInput("ai_tg_poll")}`,platform:"telegram",include_cta:false}),BarChart3)}
        {renderInputAction("AI Welcome Message","social-ai-responder","generate_caption",[{key:"ai_tg_welcome",placeholder:"Group/channel description"}],()=>({topic:`Write a warm welcome message for new members joining a Telegram group about: ${getInput("ai_tg_welcome")}`,platform:"telegram",include_cta:false}),UserPlus)}
        {renderInputAction("AI Bot Response","social-ai-responder","generate_dm_reply",[{key:"ai_tg_bot",placeholder:"User command/query..."}],()=>({message_text:getInput("ai_tg_bot"),sender_name:"user"}),Bot)}
      </TabsContent>
    </Tabs>
  );

  // ===== TIKTOK =====
  const renderTikTokContent = () => (
    <Tabs defaultValue="videos" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[{v:"videos",l:"Videos",icon:Video},{v:"publish",l:"Publish",icon:Upload},{v:"comments",l:"Comments",icon:MessageSquare},{v:"dms",l:"DMs",icon:Send},{v:"research",l:"Research",icon:Search},{v:"ai",l:"AI",icon:Brain}].map(t=>(
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background"><t.icon className="h-3 w-3"/>{t.l}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="videos" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("My Videos","tiktok-api","get_videos",{limit:20},Video)}
          {renderActionButton("User Info","tiktok-api","get_user_info",{},Users)}
        </div>
      </TabsContent>
      <TabsContent value="publish" className="space-y-2 mt-3">
        {renderInputAction("Publish Video","tiktok-api","publish_video_by_url",[{key:"tt_pub_url",placeholder:"Video URL"},{key:"tt_pub_title",placeholder:"Caption"}],()=>({video_url:getInput("tt_pub_url"),title:getInput("tt_pub_title"),privacy_level:"PUBLIC_TO_EVERYONE"}),Upload)}
        {renderInputAction("Publish Photo","tiktok-api","publish_photo",[{key:"tt_ph_title",placeholder:"Title"},{key:"tt_ph_urls",placeholder:"Image URLs (comma sep)"}],()=>({title:getInput("tt_ph_title"),image_urls:getInput("tt_ph_urls").split(",").map(s=>s.trim()),privacy_level:"PUBLIC_TO_EVERYONE"}),Image)}
      </TabsContent>
      <TabsContent value="comments" className="space-y-2 mt-3">
        {renderInputAction("Get Comments","tiktok-api","get_comments",[{key:"tt_cmt_vid",placeholder:"Video ID"}],()=>({video_id:getInput("tt_cmt_vid"),limit:50}),MessageSquare)}
        {renderInputAction("Reply","tiktok-api","reply_to_comment",[{key:"tt_rply_vid",placeholder:"Video ID"},{key:"tt_rply_cmt",placeholder:"Comment ID"},{key:"tt_rply_text",placeholder:"Reply"}],()=>({video_id:getInput("tt_rply_vid"),comment_id:getInput("tt_rply_cmt"),message:getInput("tt_rply_text")}),Send)}
      </TabsContent>
      <TabsContent value="dms" className="space-y-2 mt-3">
        {renderActionButton("Conversations","tiktok-api","get_conversations",{},MessageSquare)}
        {renderInputAction("Send DM","tiktok-api","send_dm",[{key:"tt_dm_conv",placeholder:"Conv ID"},{key:"tt_dm_text",placeholder:"Message"}],()=>({conversation_id:getInput("tt_dm_conv"),message:getInput("tt_dm_text")}),Send)}
      </TabsContent>
      <TabsContent value="research" className="space-y-2 mt-3">
        {renderInputAction("Research User","tiktok-api","research_user",[{key:"tt_ru",placeholder:"Username"}],()=>({username:getInput("tt_ru")}),Users)}
        {renderInputAction("Research Videos","tiktok-api","research_videos",[{key:"tt_rv",placeholder:"Keywords (comma sep)"}],()=>({keywords:getInput("tt_rv").split(",").map(s=>s.trim()),limit:20}),Search)}
      </TabsContent>
      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Caption","social-ai-responder","generate_caption",[{key:"ai_tt_topic",placeholder:"Topic"}],()=>({topic:getInput("ai_tt_topic"),platform:"tiktok",include_cta:true}),Brain)}
        {renderInputAction("AI DM Auto-Reply","social-ai-responder","generate_dm_reply",[{key:"ai_tt_dm",placeholder:"Incoming DM..."}],()=>({message_text:getInput("ai_tt_dm"),sender_name:"fan"}),Send)}
        {renderInputAction("AI Comment Reply","social-ai-responder","generate_dm_reply",[{key:"ai_tt_cmt",placeholder:"Comment text..."}],()=>({message_text:getInput("ai_tt_cmt"),sender_name:"viewer"}),MessageSquare)}
        {renderInputAction("AI Hashtag Strategy","social-ai-responder","generate_caption",[{key:"ai_tt_ht",placeholder:"Niche/content type"}],()=>({topic:`Generate 30 TikTok hashtags (mix of trending + niche) for: ${getInput("ai_tt_ht")}`,platform:"tiktok",include_cta:false}),Hash)}
        {renderInputAction("AI Video Ideas","social-ai-responder","generate_caption",[{key:"ai_tt_ideas",placeholder:"Your niche"}],()=>({topic:`Generate 10 viral TikTok video ideas with hooks and trends for: ${getInput("ai_tt_ideas")}`,platform:"tiktok",include_cta:false}),Video)}
        {renderInputAction("AI Bio Writer","social-ai-responder","generate_caption",[{key:"ai_tt_bio",placeholder:"Describe your brand"}],()=>({topic:`Write a compelling TikTok bio (80 chars) with CTA for: ${getInput("ai_tt_bio")}`,platform:"tiktok",include_cta:false}),Users)}
        {renderInputAction("AI Hook Generator","social-ai-responder","generate_caption",[{key:"ai_tt_hook",placeholder:"Video topic"}],()=>({topic:`Write 10 attention-grabbing TikTok video hooks (first 3 seconds) for: ${getInput("ai_tt_hook")}`,platform:"tiktok",include_cta:false}),Zap)}
        {renderInputAction("AI Duet/Stitch Ideas","social-ai-responder","generate_caption",[{key:"ai_tt_duet",placeholder:"Original video topic"}],()=>({topic:`Generate 5 creative duet/stitch response ideas for a TikTok about: ${getInput("ai_tt_duet")}`,platform:"tiktok",include_cta:false}),Repeat)}
      </TabsContent>
    </Tabs>
  );

  // ===== SNAPCHAT =====
  const renderSnapchatContent = () => (
    <Tabs defaultValue="account" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[{v:"account",l:"Account",icon:Users},{v:"campaigns",l:"Campaigns",icon:Target},{v:"ads",l:"Ads",icon:Megaphone},{v:"creatives",l:"Creatives",icon:Image},{v:"audiences",l:"Audiences",icon:Users},{v:"analytics",l:"Analytics",icon:BarChart3},{v:"catalogs",l:"Catalogs",icon:Layers},{v:"ai",l:"AI",icon:Brain}].map(t=>(
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background"><t.icon className="h-3 w-3"/>{t.l}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="account" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("Me","snapchat-api","get_me",{},Users)}
          {renderActionButton("Organizations","snapchat-api","get_organizations",{},Briefcase)}
        </div>
        {renderInputAction("Ad Accounts","snapchat-api","get_ad_accounts",[{key:"snap_org_id",placeholder:"Organization ID"}],()=>({organization_id:getInput("snap_org_id")}),Briefcase)}
      </TabsContent>
      <TabsContent value="campaigns" className="space-y-2 mt-3">
        {renderInputAction("Get Campaigns","snapchat-api","get_campaigns",[{key:"snap_camp_aa",placeholder:"Ad Account ID"}],()=>({ad_account_id:getInput("snap_camp_aa")}),Target)}
        {renderInputAction("Create Campaign","snapchat-api","create_campaign",[{key:"snap_cc_aa",placeholder:"Ad Account ID"},{key:"snap_cc_name",placeholder:"Campaign name"},{key:"snap_cc_obj",placeholder:"Objective (AWARENESS)"}],()=>({ad_account_id:getInput("snap_cc_aa"),name:getInput("snap_cc_name"),objective:getInput("snap_cc_obj")||"AWARENESS"}),Target)}
        {renderInputAction("Delete Campaign","snapchat-api","delete_campaign",[{key:"snap_dc_id",placeholder:"Campaign ID"}],()=>({campaign_id:getInput("snap_dc_id")}),Trash2)}
      </TabsContent>
      <TabsContent value="ads" className="space-y-2 mt-3">
        {renderInputAction("Get Ad Squads","snapchat-api","get_ad_squads",[{key:"snap_as_cid",placeholder:"Campaign ID"}],()=>({campaign_id:getInput("snap_as_cid")}),Layers)}
        {renderInputAction("Get Ads","snapchat-api","get_ads",[{key:"snap_ads_asid",placeholder:"Ad Squad ID"}],()=>({ad_squad_id:getInput("snap_ads_asid")}),Megaphone)}
        {renderInputAction("Create Ad","snapchat-api","create_ad",[{key:"snap_ca_asid",placeholder:"Ad Squad ID"},{key:"snap_ca_name",placeholder:"Name"},{key:"snap_ca_crid",placeholder:"Creative ID"}],()=>({ad_squad_id:getInput("snap_ca_asid"),name:getInput("snap_ca_name"),creative_id:getInput("snap_ca_crid")}),Megaphone)}
      </TabsContent>
      <TabsContent value="creatives" className="space-y-2 mt-3">
        {renderInputAction("Get Creatives","snapchat-api","get_creatives",[{key:"snap_cr_aa",placeholder:"Ad Account ID"}],()=>({ad_account_id:getInput("snap_cr_aa")}),Image)}
        {renderInputAction("Get Media","snapchat-api","get_media",[{key:"snap_md_aa",placeholder:"Ad Account ID"}],()=>({ad_account_id:getInput("snap_md_aa")}),Video)}
      </TabsContent>
      <TabsContent value="audiences" className="space-y-2 mt-3">
        {renderInputAction("Get Audiences","snapchat-api","get_audiences",[{key:"snap_aud_aa",placeholder:"Ad Account ID"}],()=>({ad_account_id:getInput("snap_aud_aa")}),Users)}
        {renderInputAction("Create Audience","snapchat-api","create_audience",[{key:"snap_ca_aa",placeholder:"Ad Account ID"},{key:"snap_ca_name",placeholder:"Name"},{key:"snap_ca_desc",placeholder:"Description"}],()=>({ad_account_id:getInput("snap_ca_aa"),name:getInput("snap_ca_name"),description:getInput("snap_ca_desc")}),UserPlus)}
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("Interest Targeting","snapchat-api","get_interest_targeting",{},Target)}
          {renderActionButton("Demographics","snapchat-api","get_demographics_targeting",{},Users)}
        </div>
      </TabsContent>
      <TabsContent value="analytics" className="space-y-2 mt-3">
        {renderInputAction("Campaign Stats","snapchat-api","get_campaign_stats",[{key:"snap_cs_id",placeholder:"Campaign ID"}],()=>({campaign_id:getInput("snap_cs_id")}),BarChart3)}
        {renderInputAction("Ad Stats","snapchat-api","get_ad_stats",[{key:"snap_as_id",placeholder:"Ad ID"}],()=>({ad_id:getInput("snap_as_id")}),BarChart3)}
        {renderInputAction("Pixels","snapchat-api","get_pixels",[{key:"snap_px_aa",placeholder:"Ad Account ID"}],()=>({ad_account_id:getInput("snap_px_aa")}),Activity)}
      </TabsContent>
      <TabsContent value="catalogs" className="space-y-2 mt-3">
        {renderInputAction("Catalogs","snapchat-api","get_catalogs",[{key:"snap_cat_org",placeholder:"Organization ID"}],()=>({organization_id:getInput("snap_cat_org")}),Layers)}
        {renderInputAction("Products","snapchat-api","get_products",[{key:"snap_prod_cat",placeholder:"Catalog ID"}],()=>({catalog_id:getInput("snap_prod_cat")}),Layers)}
      </TabsContent>
      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Ad Copy","social-ai-responder","generate_caption",[{key:"ai_snap_topic",placeholder:"Ad topic"}],()=>({topic:getInput("ai_snap_topic"),platform:"snapchat",include_cta:true}),Brain)}
        {renderInputAction("AI Story Script","social-ai-responder","generate_caption",[{key:"ai_snap_story",placeholder:"Story theme"}],()=>({topic:`Write a 5-panel Snapchat story script with captions for: ${getInput("ai_snap_story")}`,platform:"snapchat",include_cta:true}),Play)}
        {renderInputAction("AI Audience Targeting","social-ai-responder","generate_caption",[{key:"ai_snap_aud",placeholder:"Product/service"}],()=>({topic:`Suggest 5 Snapchat ad audience segments with demographics and interests for: ${getInput("ai_snap_aud")}`,platform:"snapchat",include_cta:false}),Target)}
        {renderInputAction("AI Campaign Strategy","social-ai-responder","generate_caption",[{key:"ai_snap_camp",placeholder:"Campaign goal"}],()=>({topic:`Create a Snapchat ad campaign strategy with budget allocation and creative ideas for: ${getInput("ai_snap_camp")}`,platform:"snapchat",include_cta:false}),Briefcase)}
        {renderInputAction("AI Snap DM Reply","social-ai-responder","generate_dm_reply",[{key:"ai_snap_dm",placeholder:"Incoming snap message..."}],()=>({message_text:getInput("ai_snap_dm"),sender_name:"friend"}),Send)}
      </TabsContent>
    </Tabs>
  );

  // ===== THREADS =====
  const renderThreadsContent = () => (
    <Tabs defaultValue="posts" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[{v:"posts",l:"Posts",icon:MessageSquare},{v:"publish",l:"Publish",icon:Send},{v:"replies",l:"Replies",icon:MessageCircle},{v:"insights",l:"Insights",icon:BarChart3},{v:"ai",l:"AI",icon:Brain}].map(t=>(
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background"><t.icon className="h-3 w-3"/>{t.l}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="posts" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("My Threads","threads-api","get_threads",{limit:25},MessageSquare)}
          {renderActionButton("Profile","threads-api","get_profile",{},Users)}
          {renderActionButton("Publish Limit","threads-api","get_publishing_limit",{},Activity)}
        </div>
        {renderInputAction("Get Thread","threads-api","get_thread",[{key:"th_id",placeholder:"Thread ID"}],()=>({thread_id:getInput("th_id")}),Eye)}
      </TabsContent>
      <TabsContent value="publish" className="space-y-2 mt-3">
        {renderInputAction("Text Thread","threads-api","create_text_thread",[{key:"th_text",placeholder:"What's on your mind?"}],()=>({text:getInput("th_text")}),Send)}
        {renderInputAction("Image Thread","threads-api","create_image_thread",[{key:"th_img_url",placeholder:"Image URL"},{key:"th_img_text",placeholder:"Caption"}],()=>({image_url:getInput("th_img_url"),text:getInput("th_img_text")}),Image)}
        {renderInputAction("Video Thread","threads-api","create_video_thread",[{key:"th_vid_url",placeholder:"Video URL"},{key:"th_vid_text",placeholder:"Caption"}],()=>({video_url:getInput("th_vid_url"),text:getInput("th_vid_text")}),Video)}
        {renderInputAction("Reply to Thread","threads-api","create_text_thread",[{key:"th_reply_id",placeholder:"Thread ID to reply"},{key:"th_reply_text",placeholder:"Reply..."}],()=>({text:getInput("th_reply_text"),reply_to_id:getInput("th_reply_id")}),MessageCircle)}
        {renderInputAction("Quote Thread","threads-api","create_text_thread",[{key:"th_quote_id",placeholder:"Thread ID to quote"},{key:"th_quote_text",placeholder:"Comment..."}],()=>({text:getInput("th_quote_text"),quote_post_id:getInput("th_quote_id")}),Repeat)}
      </TabsContent>
      <TabsContent value="replies" className="space-y-2 mt-3">
        {renderInputAction("Get Replies","threads-api","get_replies",[{key:"th_rep_id",placeholder:"Thread ID"}],()=>({thread_id:getInput("th_rep_id"),limit:25}),MessageCircle)}
        {renderInputAction("Conversation","threads-api","get_conversation",[{key:"th_conv_id",placeholder:"Thread ID"}],()=>({thread_id:getInput("th_conv_id"),limit:25}),Layers)}
        {renderInputAction("Hide Reply","threads-api","hide_reply",[{key:"th_hide_id",placeholder:"Reply ID"}],()=>({reply_id:getInput("th_hide_id")}),EyeOff)}
      </TabsContent>
      <TabsContent value="insights" className="space-y-2 mt-3">
        {renderInputAction("Thread Insights","threads-api","get_thread_insights",[{key:"th_ins_id",placeholder:"Thread ID"}],()=>({thread_id:getInput("th_ins_id")}),BarChart3)}
        {renderActionButton("User Insights (30d)","threads-api","get_user_insights",{period:"last_30_days"},TrendingUp)}
      </TabsContent>
      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Thread Post","social-ai-responder","generate_caption",[{key:"ai_th_topic",placeholder:"Topic"}],()=>({topic:getInput("ai_th_topic"),platform:"threads",include_cta:true}),Brain)}
        {renderInputAction("AI Reply","social-ai-responder","generate_dm_reply",[{key:"ai_th_reply",placeholder:"Thread to reply to..."}],()=>({message_text:getInput("ai_th_reply"),sender_name:"user"}),Zap)}
        {renderInputAction("AI Conversation Starter","social-ai-responder","generate_caption",[{key:"ai_th_convo",placeholder:"Your niche"}],()=>({topic:`Write 10 engaging Threads conversation starters (questions, opinions, debates) for: ${getInput("ai_th_convo")}`,platform:"threads",include_cta:false}),MessageCircle)}
        {renderInputAction("AI Quote Thread","social-ai-responder","generate_caption",[{key:"ai_th_quote",placeholder:"Original thread topic"}],()=>({topic:`Write a witty quote-thread response adding unique perspective to: ${getInput("ai_th_quote")}`,platform:"threads",include_cta:false}),Repeat)}
        {renderInputAction("AI Bio Writer","social-ai-responder","generate_caption",[{key:"ai_th_bio",placeholder:"Describe your brand"}],()=>({topic:`Write a compelling Threads bio (150 chars) for: ${getInput("ai_th_bio")}`,platform:"threads",include_cta:false}),Users)}
        {renderInputAction("AI Content Calendar","social-ai-responder","generate_caption",[{key:"ai_th_cal",placeholder:"Niche for 7-day plan"}],()=>({topic:`Create a 7-day Threads content calendar with daily post ideas for: ${getInput("ai_th_cal")}`,platform:"threads",include_cta:false}),Calendar)}
      </TabsContent>
    </Tabs>
  );

  // ===== WHATSAPP =====
  const renderWhatsAppContent = () => (
    <Tabs defaultValue="messages" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[{v:"messages",l:"Messages",icon:Send},{v:"media",l:"Media",icon:Image},{v:"templates",l:"Templates",icon:FileText},{v:"business",l:"Business",icon:Briefcase},{v:"analytics",l:"Analytics",icon:BarChart3},{v:"ai",l:"AI",icon:Brain}].map(t=>(
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background"><t.icon className="h-3 w-3"/>{t.l}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="messages" className="space-y-2 mt-3">
        {renderInputAction("Send Text","whatsapp-api","send_text",[{key:"wa_to",placeholder:"Phone (+1234...)"},{key:"wa_text",placeholder:"Message"}],()=>({to:getInput("wa_to"),text:getInput("wa_text")}),Send)}
        {renderInputAction("Send Image","whatsapp-api","send_image",[{key:"wa_img_to",placeholder:"Phone"},{key:"wa_img_url",placeholder:"Image URL"},{key:"wa_img_cap",placeholder:"Caption"}],()=>({to:getInput("wa_img_to"),image_url:getInput("wa_img_url"),caption:getInput("wa_img_cap")}),Image)}
        {renderInputAction("Send Video","whatsapp-api","send_video",[{key:"wa_vid_to",placeholder:"Phone"},{key:"wa_vid_url",placeholder:"Video URL"}],()=>({to:getInput("wa_vid_to"),video_url:getInput("wa_vid_url")}),Video)}
        {renderInputAction("Send Document","whatsapp-api","send_document",[{key:"wa_doc_to",placeholder:"Phone"},{key:"wa_doc_url",placeholder:"Doc URL"},{key:"wa_doc_name",placeholder:"Filename"}],()=>({to:getInput("wa_doc_to"),document_url:getInput("wa_doc_url"),filename:getInput("wa_doc_name")}),FileText)}
        {renderInputAction("Send Location","whatsapp-api","send_location",[{key:"wa_loc_to",placeholder:"Phone"},{key:"wa_loc_lat",placeholder:"Lat"},{key:"wa_loc_lng",placeholder:"Lng"}],()=>({to:getInput("wa_loc_to"),latitude:parseFloat(getInput("wa_loc_lat")),longitude:parseFloat(getInput("wa_loc_lng"))}),MapPin)}
        {renderInputAction("Send Template","whatsapp-api","send_template",[{key:"wa_tpl_to",placeholder:"Phone"},{key:"wa_tpl_name",placeholder:"Template name"},{key:"wa_tpl_lang",placeholder:"Language (en_US)"}],()=>({to:getInput("wa_tpl_to"),template_name:getInput("wa_tpl_name"),language:getInput("wa_tpl_lang")||"en_US"}),FileText)}
        {renderInputAction("React","whatsapp-api","send_reaction",[{key:"wa_react_to",placeholder:"Phone"},{key:"wa_react_msg",placeholder:"Message ID"},{key:"wa_react_emoji",placeholder:"Emoji"}],()=>({to:getInput("wa_react_to"),message_id:getInput("wa_react_msg"),emoji:getInput("wa_react_emoji")}),Heart)}
        {renderInputAction("Mark Read","whatsapp-api","mark_as_read",[{key:"wa_read_msg",placeholder:"Message ID"}],()=>({message_id:getInput("wa_read_msg")}),Eye)}
      </TabsContent>
      <TabsContent value="media" className="space-y-2 mt-3">
        {renderInputAction("Get Media","whatsapp-api","get_media",[{key:"wa_media_id",placeholder:"Media ID"}],()=>({media_id:getInput("wa_media_id")}),Image)}
        {renderInputAction("Delete Media","whatsapp-api","delete_media",[{key:"wa_del_media",placeholder:"Media ID"}],()=>({media_id:getInput("wa_del_media")}),Trash2)}
      </TabsContent>
      <TabsContent value="templates" className="space-y-2 mt-3">
        {renderInputAction("Get Templates","whatsapp-api","get_templates",[{key:"wa_tpl_waba",placeholder:"WABA ID"}],()=>({waba_id:getInput("wa_tpl_waba"),limit:50}),FileText)}
        {renderInputAction("Delete Template","whatsapp-api","delete_template",[{key:"wa_dtpl_waba",placeholder:"WABA ID"},{key:"wa_dtpl_name",placeholder:"Template name"}],()=>({waba_id:getInput("wa_dtpl_waba"),name:getInput("wa_dtpl_name")}),Trash2)}
      </TabsContent>
      <TabsContent value="business" className="space-y-2 mt-3">
        {renderInputAction("Business Profile","whatsapp-api","get_business_profile",[{key:"wa_bp_pid",placeholder:"Phone Number ID"}],()=>({phone_number_id:getInput("wa_bp_pid")}),Briefcase)}
        {renderInputAction("Phone Numbers","whatsapp-api","get_phone_numbers",[{key:"wa_pn_waba",placeholder:"WABA ID"}],()=>({waba_id:getInput("wa_pn_waba")}),Phone)}
        {renderInputAction("Get Flows","whatsapp-api","get_flows",[{key:"wa_fl_waba",placeholder:"WABA ID"}],()=>({waba_id:getInput("wa_fl_waba")}),Activity)}
      </TabsContent>
      <TabsContent value="analytics" className="space-y-2 mt-3">
        {renderInputAction("Analytics","whatsapp-api","get_analytics",[{key:"wa_an_waba",placeholder:"WABA ID"}],()=>({waba_id:getInput("wa_an_waba")}),BarChart3)}
        {renderInputAction("Conversation Analytics","whatsapp-api","get_conversation_analytics",[{key:"wa_ca_waba",placeholder:"WABA ID"}],()=>({waba_id:getInput("wa_ca_waba")}),TrendingUp)}
      </TabsContent>
      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Message","social-ai-responder","generate_caption",[{key:"ai_wa_topic",placeholder:"Topic"}],()=>({topic:getInput("ai_wa_topic"),platform:"whatsapp",include_cta:true}),Brain)}
        {renderInputAction("AI Auto-Reply","social-ai-responder","generate_dm_reply",[{key:"ai_wa_msg",placeholder:"Incoming message..."}],()=>({message_text:getInput("ai_wa_msg"),sender_name:"customer"}),Zap)}
        {renderInputAction("AI Template Creator","social-ai-responder","generate_caption",[{key:"ai_wa_tpl",placeholder:"Template purpose (welcome, promo, etc)"}],()=>({topic:`Write a WhatsApp Business message template for: ${getInput("ai_wa_tpl")}. Include header, body with variables {{1}}, and CTA button text.`,platform:"whatsapp",include_cta:true}),FileText)}
        {renderInputAction("AI Broadcast Message","social-ai-responder","generate_caption",[{key:"ai_wa_bcast",placeholder:"Broadcast topic"}],()=>({topic:`Write a WhatsApp broadcast message (max 1024 chars) promoting: ${getInput("ai_wa_bcast")}`,platform:"whatsapp",include_cta:true}),Megaphone)}
        {renderInputAction("AI Customer Service","social-ai-responder","generate_dm_reply",[{key:"ai_wa_cs",placeholder:"Customer complaint/query..."}],()=>({message_text:getInput("ai_wa_cs"),sender_name:"customer"}),Shield)}
        {renderInputAction("AI Quick Replies","social-ai-responder","generate_caption",[{key:"ai_wa_qr",placeholder:"Business type/niche"}],()=>({topic:`Generate 10 WhatsApp quick reply templates for common customer questions about: ${getInput("ai_wa_qr")}`,platform:"whatsapp",include_cta:false}),Zap)}
        {renderInputAction("AI Catalog Description","social-ai-responder","generate_caption",[{key:"ai_wa_cat",placeholder:"Product name/type"}],()=>({topic:`Write a compelling WhatsApp catalog product description for: ${getInput("ai_wa_cat")}`,platform:"whatsapp",include_cta:true}),Layers)}
      </TabsContent>
    </Tabs>
  );

  // ===== SIGNAL =====
  const renderSignalContent = () => (
    <Tabs defaultValue="messages" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[{v:"messages",l:"Messages",icon:Send},{v:"groups",l:"Groups",icon:Users},{v:"contacts",l:"Contacts",icon:Users},{v:"setup",l:"Setup",icon:Settings},{v:"ai",l:"AI",icon:Brain}].map(t=>(
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background"><t.icon className="h-3 w-3"/>{t.l}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="messages" className="space-y-2 mt-3">
        {renderInputAction("Send Message","signal-api","send_message",[{key:"sig_from",placeholder:"Sender number"},{key:"sig_to",placeholder:"Recipient"},{key:"sig_text",placeholder:"Message"}],()=>({sender_number:getInput("sig_from"),to:getInput("sig_to"),message:getInput("sig_text")}),Send)}
        {renderInputAction("Get Messages","signal-api","get_messages",[{key:"sig_recv",placeholder:"Your number"}],()=>({number:getInput("sig_recv")}),MessageSquare)}
        {renderInputAction("React","signal-api","send_reaction",[{key:"sig_react_from",placeholder:"Sender"},{key:"sig_react_to",placeholder:"Recipient"},{key:"sig_react_emoji",placeholder:"Emoji"},{key:"sig_react_ts",placeholder:"Target timestamp"}],()=>({sender_number:getInput("sig_react_from"),recipient:getInput("sig_react_to"),emoji:getInput("sig_react_emoji"),target_author:getInput("sig_react_to"),target_timestamp:parseInt(getInput("sig_react_ts"))}),Heart)}
        {renderInputAction("Typing Indicator","signal-api","send_typing",[{key:"sig_type_from",placeholder:"Sender"},{key:"sig_type_to",placeholder:"Recipient"}],()=>({sender_number:getInput("sig_type_from"),recipient:getInput("sig_type_to")}),Activity)}
      </TabsContent>
      <TabsContent value="groups" className="space-y-2 mt-3">
        {renderInputAction("List Groups","signal-api","list_groups",[{key:"sig_lg_num",placeholder:"Your number"}],()=>({number:getInput("sig_lg_num")}),Users)}
        {renderInputAction("Create Group","signal-api","create_group",[{key:"sig_cg_num",placeholder:"Your number"},{key:"sig_cg_name",placeholder:"Group name"},{key:"sig_cg_members",placeholder:"Members (comma sep)"}],()=>({number:getInput("sig_cg_num"),name:getInput("sig_cg_name"),members:getInput("sig_cg_members").split(",").map(s=>s.trim())}),UserPlus)}
        {renderInputAction("Group Message","signal-api","send_group_message",[{key:"sig_gm_from",placeholder:"Sender"},{key:"sig_gm_gid",placeholder:"Group ID"},{key:"sig_gm_text",placeholder:"Message"}],()=>({sender_number:getInput("sig_gm_from"),group_id:getInput("sig_gm_gid"),message:getInput("sig_gm_text")}),Send)}
      </TabsContent>
      <TabsContent value="contacts" className="space-y-2 mt-3">
        {renderInputAction("List Contacts","signal-api","list_contacts",[{key:"sig_lc_num",placeholder:"Your number"}],()=>({number:getInput("sig_lc_num")}),Users)}
        {renderInputAction("Block","signal-api","block_contact",[{key:"sig_blk_num",placeholder:"Your number"},{key:"sig_blk_who",placeholder:"Contact number"}],()=>({number:getInput("sig_blk_num"),recipient:getInput("sig_blk_who")}),Shield)}
        {renderInputAction("Unblock","signal-api","unblock_contact",[{key:"sig_ublk_num",placeholder:"Your number"},{key:"sig_ublk_who",placeholder:"Contact number"}],()=>({number:getInput("sig_ublk_num"),recipient:getInput("sig_ublk_who")}),UserPlus)}
      </TabsContent>
      <TabsContent value="setup" className="space-y-2 mt-3">
        {renderInputAction("List Accounts","signal-api","list_accounts",[],()=>({}),Users)}
        {renderInputAction("Register","signal-api","register",[{key:"sig_reg_url",placeholder:"API URL"},{key:"sig_reg_num",placeholder:"Phone number"}],()=>({api_url:getInput("sig_reg_url"),number:getInput("sig_reg_num")}),Settings)}
        {renderInputAction("Verify","signal-api","verify",[{key:"sig_ver_url",placeholder:"API URL"},{key:"sig_ver_num",placeholder:"Phone"},{key:"sig_ver_code",placeholder:"Code"}],()=>({api_url:getInput("sig_ver_url"),number:getInput("sig_ver_num"),verification_code:getInput("sig_ver_code")}),Shield)}
      </TabsContent>
      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Message","social-ai-responder","generate_caption",[{key:"ai_sig_topic",placeholder:"Topic"}],()=>({topic:getInput("ai_sig_topic"),platform:"signal",include_cta:false}),Brain)}
        {renderInputAction("AI Auto-Reply","social-ai-responder","generate_dm_reply",[{key:"ai_sig_dm",placeholder:"Incoming message..."}],()=>({message_text:getInput("ai_sig_dm"),sender_name:"contact"}),Zap)}
        {renderInputAction("AI Group Announcement","social-ai-responder","generate_caption",[{key:"ai_sig_grp",placeholder:"Announcement topic"}],()=>({topic:`Write a Signal group announcement about: ${getInput("ai_sig_grp")}`,platform:"signal",include_cta:false}),Megaphone)}
        {renderInputAction("AI Secure Meeting Invite","social-ai-responder","generate_caption",[{key:"ai_sig_meet",placeholder:"Meeting purpose"}],()=>({topic:`Write a professional Signal meeting invitation for: ${getInput("ai_sig_meet")}`,platform:"signal",include_cta:false}),Calendar)}
      </TabsContent>
    </Tabs>
  );

  // ===== YOUTUBE =====
  const renderYouTubeContent = () => (
    <Tabs defaultValue="channel" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[{v:"channel",l:"Channel",icon:Users},{v:"videos",l:"Videos",icon:Video},{v:"comments",l:"Comments",icon:MessageSquare},{v:"playlists",l:"Playlists",icon:List},{v:"search",l:"Search",icon:Search},{v:"live",l:"Live",icon:Radio},{v:"analytics",l:"Analytics",icon:BarChart3},{v:"ai",l:"AI",icon:Brain}].map(t=>(
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background"><t.icon className="h-3 w-3"/>{t.l}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="channel" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("My Channel","youtube-api","get_my_channel",{},Users)}
          {renderActionButton("Subscriptions","youtube-api","get_subscriptions",{limit:25},Bell)}
        </div>
        {renderInputAction("Lookup Channel","youtube-api","get_channel_by_username",[{key:"yt_lookup",placeholder:"@handle"}],()=>({username:getInput("yt_lookup")}),Search)}
        {renderInputAction("Subscribe","youtube-api","subscribe",[{key:"yt_sub_ch",placeholder:"Channel ID"}],()=>({channel_id:getInput("yt_sub_ch")}),UserPlus)}
      </TabsContent>
      <TabsContent value="videos" className="space-y-2 mt-3">
        {renderActionButton("My Videos","youtube-api","list_my_videos",{limit:25},Video)}
        {renderInputAction("Get Video","youtube-api","get_video",[{key:"yt_vid_id",placeholder:"Video ID"}],()=>({video_id:getInput("yt_vid_id")}),Eye)}
        {renderInputAction("Delete Video","youtube-api","delete_video",[{key:"yt_del_vid",placeholder:"Video ID"}],()=>({video_id:getInput("yt_del_vid")}),Trash2)}
        {renderInputAction("Like Video","youtube-api","rate_video",[{key:"yt_like_vid",placeholder:"Video ID"}],()=>({video_id:getInput("yt_like_vid"),rating:"like"}),Heart)}
        {renderInputAction("Captions","youtube-api","get_captions",[{key:"yt_cap_vid",placeholder:"Video ID"}],()=>({video_id:getInput("yt_cap_vid")}),FileText)}
      </TabsContent>
      <TabsContent value="comments" className="space-y-2 mt-3">
        {renderInputAction("Get Comments","youtube-api","get_comments",[{key:"yt_cmt_vid",placeholder:"Video ID"}],()=>({video_id:getInput("yt_cmt_vid"),limit:20}),MessageSquare)}
        {renderInputAction("Post Comment","youtube-api","post_comment",[{key:"yt_pc_vid",placeholder:"Video ID"},{key:"yt_pc_text",placeholder:"Comment..."}],()=>({video_id:getInput("yt_pc_vid"),text:getInput("yt_pc_text")}),Send)}
        {renderInputAction("Reply","youtube-api","reply_comment",[{key:"yt_rc_parent",placeholder:"Parent Comment ID"},{key:"yt_rc_text",placeholder:"Reply..."}],()=>({parent_id:getInput("yt_rc_parent"),text:getInput("yt_rc_text")}),MessageSquare)}
        {renderInputAction("Delete Comment","youtube-api","delete_comment",[{key:"yt_dc_id",placeholder:"Comment ID"}],()=>({comment_id:getInput("yt_dc_id")}),Trash2)}
      </TabsContent>
      <TabsContent value="playlists" className="space-y-2 mt-3">
        {renderActionButton("My Playlists","youtube-api","get_playlists",{limit:25},List)}
        {renderInputAction("Create Playlist","youtube-api","create_playlist",[{key:"yt_pl_title",placeholder:"Title"},{key:"yt_pl_desc",placeholder:"Description"}],()=>({title:getInput("yt_pl_title"),description:getInput("yt_pl_desc")}),FolderOpen)}
        {renderInputAction("Add to Playlist","youtube-api","add_to_playlist",[{key:"yt_apl_pl",placeholder:"Playlist ID"},{key:"yt_apl_vid",placeholder:"Video ID"}],()=>({playlist_id:getInput("yt_apl_pl"),video_id:getInput("yt_apl_vid")}),UserPlus)}
        {renderInputAction("Delete Playlist","youtube-api","delete_playlist",[{key:"yt_dpl_id",placeholder:"Playlist ID"}],()=>({playlist_id:getInput("yt_dpl_id")}),Trash2)}
      </TabsContent>
      <TabsContent value="search" className="space-y-2 mt-3">
        {renderInputAction("Search","youtube-api","search",[{key:"yt_sq",placeholder:"Query"},{key:"yt_st",placeholder:"Type (video/channel/playlist)"}],()=>({query:getInput("yt_sq"),type:getInput("yt_st")||"video",limit:10}),Search)}
        {renderInputAction("Search My Channel","youtube-api","search_my_channel",[{key:"yt_smc",placeholder:"Query"}],()=>({query:getInput("yt_smc"),limit:10}),Search)}
      </TabsContent>
      <TabsContent value="live" className="space-y-2 mt-3">
        {renderActionButton("Live Broadcasts","youtube-api","list_live_broadcasts",{status:"all",limit:10},Radio)}
        {renderInputAction("Create Broadcast","youtube-api","create_live_broadcast",[{key:"yt_lb_title",placeholder:"Title"},{key:"yt_lb_start",placeholder:"Start time (ISO)"}],()=>({title:getInput("yt_lb_title"),start_time:getInput("yt_lb_start")}),Radio)}
        {renderInputAction("Chat Messages","youtube-api","get_live_chat_messages",[{key:"yt_lc_id",placeholder:"Live Chat ID"}],()=>({live_chat_id:getInput("yt_lc_id"),limit:50}),MessageSquare)}
        {renderInputAction("Send Chat","youtube-api","send_live_chat_message",[{key:"yt_sc_id",placeholder:"Live Chat ID"},{key:"yt_sc_msg",placeholder:"Message"}],()=>({live_chat_id:getInput("yt_sc_id"),message:getInput("yt_sc_msg")}),Send)}
      </TabsContent>
      <TabsContent value="analytics" className="space-y-2 mt-3">
        {renderActionButton("Channel Analytics","youtube-api","get_channel_analytics",{},BarChart3)}
        {renderActionButton("Demographics","youtube-api","get_demographics",{},Users)}
        {renderActionButton("Traffic Sources","youtube-api","get_traffic_sources",{},TrendingUp)}
        {renderInputAction("Video Analytics","youtube-api","get_video_analytics",[{key:"yt_va_vid",placeholder:"Video ID"}],()=>({video_id:getInput("yt_va_vid")}),BarChart3)}
      </TabsContent>
      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Title/Description","social-ai-responder","generate_caption",[{key:"ai_yt_topic",placeholder:"Video topic"}],()=>({topic:getInput("ai_yt_topic"),platform:"youtube",include_cta:true}),Brain)}
        {renderInputAction("AI Comment Reply","social-ai-responder","generate_dm_reply",[{key:"ai_yt_cmt",placeholder:"Comment text..."}],()=>({message_text:getInput("ai_yt_cmt"),sender_name:"viewer"}),Zap)}
        {renderInputAction("AI Tag Generator","social-ai-responder","generate_caption",[{key:"ai_yt_tags",placeholder:"Video topic"}],()=>({topic:`Generate 20 SEO-optimized YouTube tags for a video about: ${getInput("ai_yt_tags")}`,platform:"youtube",include_cta:false}),Hash)}
        {renderInputAction("AI Thumbnail Text","social-ai-responder","generate_caption",[{key:"ai_yt_thumb",placeholder:"Video topic"}],()=>({topic:`Write 5 attention-grabbing YouTube thumbnail text options (max 5 words each) for: ${getInput("ai_yt_thumb")}`,platform:"youtube",include_cta:false}),Image)}
        {renderInputAction("AI Script Outline","social-ai-responder","generate_caption",[{key:"ai_yt_script",placeholder:"Video topic"}],()=>({topic:`Write a YouTube video script outline with intro hook, 5 main points, and CTA for: ${getInput("ai_yt_script")}`,platform:"youtube",include_cta:true}),FileText)}
        {renderInputAction("AI Community Post","social-ai-responder","generate_caption",[{key:"ai_yt_comm",placeholder:"Topic for community tab"}],()=>({topic:`Write an engaging YouTube community post with poll options about: ${getInput("ai_yt_comm")}`,platform:"youtube",include_cta:false}),Users)}
        {renderInputAction("AI End Screen CTA","social-ai-responder","generate_caption",[{key:"ai_yt_end",placeholder:"Video topic"}],()=>({topic:`Write 3 compelling YouTube end-screen verbal CTAs for a video about: ${getInput("ai_yt_end")}`,platform:"youtube",include_cta:true}),Play)}
        {renderInputAction("AI Live Chat Mod","social-ai-responder","generate_dm_reply",[{key:"ai_yt_live",placeholder:"Live chat message..."}],()=>({message_text:getInput("ai_yt_live"),sender_name:"viewer"}),Radio)}
        {renderInputAction("AI Shorts Idea","social-ai-responder","generate_caption",[{key:"ai_yt_shorts",placeholder:"Your niche"}],()=>({topic:`Generate 10 viral YouTube Shorts ideas with hooks for: ${getInput("ai_yt_shorts")}`,platform:"youtube",include_cta:false}),Video)}
      </TabsContent>
    </Tabs>
  );

  // ===== PINTEREST =====
  const renderPinterestContent = () => (
    <Tabs defaultValue="pins" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[{v:"pins",l:"Pins",icon:Image},{v:"boards",l:"Boards",icon:Layers},{v:"search",l:"Search",icon:Search},{v:"analytics",l:"Analytics",icon:BarChart3},{v:"ads",l:"Ads",icon:Megaphone},{v:"ai",l:"AI",icon:Brain}].map(t=>(
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background"><t.icon className="h-3 w-3"/>{t.l}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="pins" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("My Account","pinterest-api","get_account",{},Users)}
          {renderActionButton("My Pins","pinterest-api","get_pins",{limit:25},Image)}
        </div>
        {renderInputAction("Create Pin","pinterest-api","create_pin",[{key:"pin_title",placeholder:"Title"},{key:"pin_desc",placeholder:"Description"},{key:"pin_board",placeholder:"Board ID"},{key:"pin_img",placeholder:"Image URL"}],()=>({title:getInput("pin_title"),description:getInput("pin_desc"),board_id:getInput("pin_board"),image_url:getInput("pin_img")}),Image)}
        {renderInputAction("Get Pin","pinterest-api","get_pin",[{key:"pin_id",placeholder:"Pin ID"}],()=>({pin_id:getInput("pin_id")}),Eye)}
        {renderInputAction("Delete Pin","pinterest-api","delete_pin",[{key:"pin_del_id",placeholder:"Pin ID"}],()=>({pin_id:getInput("pin_del_id")}),Trash2)}
        {renderInputAction("Pin Analytics","pinterest-api","get_pin_analytics",[{key:"pin_an_id",placeholder:"Pin ID"}],()=>({pin_id:getInput("pin_an_id")}),BarChart3)}
      </TabsContent>
      <TabsContent value="boards" className="space-y-2 mt-3">
        {renderActionButton("My Boards","pinterest-api","get_boards",{limit:25},Layers)}
        {renderInputAction("Create Board","pinterest-api","create_board",[{key:"brd_name",placeholder:"Name"},{key:"brd_desc",placeholder:"Description"}],()=>({name:getInput("brd_name"),description:getInput("brd_desc")}),Layers)}
        {renderInputAction("Board Pins","pinterest-api","get_board_pins",[{key:"brd_pins_id",placeholder:"Board ID"}],()=>({board_id:getInput("brd_pins_id"),limit:25}),Image)}
        {renderInputAction("Board Sections","pinterest-api","get_board_sections",[{key:"brd_sec_id",placeholder:"Board ID"}],()=>({board_id:getInput("brd_sec_id")}),FolderOpen)}
        {renderInputAction("Delete Board","pinterest-api","delete_board",[{key:"brd_del_id",placeholder:"Board ID"}],()=>({board_id:getInput("brd_del_id")}),Trash2)}
      </TabsContent>
      <TabsContent value="search" className="space-y-2 mt-3">
        {renderInputAction("Search Pins","pinterest-api","search_pins",[{key:"pin_sq",placeholder:"Query"}],()=>({query:getInput("pin_sq"),limit:10}),Search)}
        {renderInputAction("Search Boards","pinterest-api","search_boards",[{key:"brd_sq",placeholder:"Query"}],()=>({query:getInput("brd_sq"),limit:10}),Search)}
        {renderInputAction("Related Terms","pinterest-api","get_related_terms",[{key:"pin_rt",placeholder:"Term"}],()=>({term:getInput("pin_rt")}),Hash)}
      </TabsContent>
      <TabsContent value="analytics" className="space-y-2 mt-3">
        {renderActionButton("Account Analytics","pinterest-api","get_account_analytics",{},BarChart3)}
        {renderActionButton("Top Pins","pinterest-api","get_top_pins",{},TrendingUp)}
        {renderActionButton("Top Video Pins","pinterest-api","get_top_video_pins",{},Video)}
      </TabsContent>
      <TabsContent value="ads" className="space-y-2 mt-3">
        {renderActionButton("Ad Accounts","pinterest-api","get_ad_accounts",{},Briefcase)}
        {renderInputAction("Campaigns","pinterest-api","get_campaigns",[{key:"pin_ad_aa",placeholder:"Ad Account ID"}],()=>({ad_account_id:getInput("pin_ad_aa")}),Target)}
        {renderInputAction("Ad Analytics","pinterest-api","get_ad_analytics",[{key:"pin_aan_id",placeholder:"Ad Account ID"}],()=>({ad_account_id:getInput("pin_aan_id")}),BarChart3)}
      </TabsContent>
      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Pin Description","social-ai-responder","generate_caption",[{key:"ai_pin_topic",placeholder:"Pin topic"}],()=>({topic:getInput("ai_pin_topic"),platform:"pinterest",include_cta:true}),Brain)}
        {renderInputAction("AI Board Strategy","social-ai-responder","generate_caption",[{key:"ai_pin_board",placeholder:"Your niche"}],()=>({topic:`Suggest 10 Pinterest board ideas with SEO-optimized names and descriptions for: ${getInput("ai_pin_board")}`,platform:"pinterest",include_cta:false}),Layers)}
        {renderInputAction("AI SEO Keywords","social-ai-responder","generate_caption",[{key:"ai_pin_seo",placeholder:"Product/topic"}],()=>({topic:`Generate 20 Pinterest SEO keywords and long-tail search terms for: ${getInput("ai_pin_seo")}`,platform:"pinterest",include_cta:false}),Search)}
        {renderInputAction("AI Ad Copy","social-ai-responder","generate_caption",[{key:"ai_pin_ad",placeholder:"Product to advertise"}],()=>({topic:`Write Pinterest promoted pin ad copy with headline and description for: ${getInput("ai_pin_ad")}`,platform:"pinterest",include_cta:true}),Megaphone)}
        {renderInputAction("AI Content Calendar","social-ai-responder","generate_caption",[{key:"ai_pin_cal",placeholder:"Niche for 7-day plan"}],()=>({topic:`Create a 7-day Pinterest pinning schedule with 5 pins/day strategy for: ${getInput("ai_pin_cal")}`,platform:"pinterest",include_cta:false}),Calendar)}
        {renderInputAction("AI Idea Pin Script","social-ai-responder","generate_caption",[{key:"ai_pin_idea",placeholder:"Topic for idea pin"}],()=>({topic:`Write a 5-slide Pinterest Idea Pin script with text overlays for: ${getInput("ai_pin_idea")}`,platform:"pinterest",include_cta:true}),Play)}
      </TabsContent>
    </Tabs>
  );

  // ===== DISCORD =====
  const renderDiscordContent = () => (
    <Tabs defaultValue="messages" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[{v:"messages",l:"Messages",icon:Send},{v:"guilds",l:"Servers",icon:Globe},{v:"members",l:"Members",icon:Users},{v:"roles",l:"Roles",icon:Shield},{v:"channels",l:"Channels",icon:Hash},{v:"webhooks",l:"Webhooks",icon:Zap},{v:"events",l:"Events",icon:Calendar},{v:"ai",l:"AI",icon:Brain}].map(t=>(
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background"><t.icon className="h-3 w-3"/>{t.l}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="messages" className="space-y-2 mt-3">
        {renderInputAction("Get Messages","discord-api","get_messages",[{key:"dc_msg_ch",placeholder:"Channel ID"}],()=>({channel_id:getInput("dc_msg_ch"),limit:50}),MessageSquare)}
        {renderInputAction("Send Message","discord-api","send_message",[{key:"dc_send_ch",placeholder:"Channel ID"},{key:"dc_send_text",placeholder:"Message"}],()=>({channel_id:getInput("dc_send_ch"),content:getInput("dc_send_text")}),Send)}
        {renderInputAction("Edit Message","discord-api","edit_message",[{key:"dc_edit_ch",placeholder:"Channel ID"},{key:"dc_edit_msg",placeholder:"Message ID"},{key:"dc_edit_text",placeholder:"New content"}],()=>({channel_id:getInput("dc_edit_ch"),message_id:getInput("dc_edit_msg"),content:getInput("dc_edit_text")}),FileText)}
        {renderInputAction("Delete Message","discord-api","delete_message",[{key:"dc_del_ch",placeholder:"Channel ID"},{key:"dc_del_msg",placeholder:"Message ID"}],()=>({channel_id:getInput("dc_del_ch"),message_id:getInput("dc_del_msg")}),Trash2)}
        {renderInputAction("Pin Message","discord-api","pin_message",[{key:"dc_pin_ch",placeholder:"Channel ID"},{key:"dc_pin_msg",placeholder:"Message ID"}],()=>({channel_id:getInput("dc_pin_ch"),message_id:getInput("dc_pin_msg")}),Pin)}
        {renderInputAction("React","discord-api","add_reaction",[{key:"dc_react_ch",placeholder:"Channel ID"},{key:"dc_react_msg",placeholder:"Message ID"},{key:"dc_react_emoji",placeholder:"Emoji (e.g. 👍)"}],()=>({channel_id:getInput("dc_react_ch"),message_id:getInput("dc_react_msg"),emoji:getInput("dc_react_emoji")}),Heart)}
      </TabsContent>
      <TabsContent value="guilds" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("Me","discord-api","get_me",{},Users)}
          {renderActionButton("My Servers","discord-api","get_my_guilds",{limit:100},Globe)}
        </div>
        {renderInputAction("Get Server","discord-api","get_guild",[{key:"dc_guild_id",placeholder:"Server ID"}],()=>({guild_id:getInput("dc_guild_id")}),Globe)}
        {renderInputAction("Server Channels","discord-api","get_guild_channels",[{key:"dc_gch_id",placeholder:"Server ID"}],()=>({guild_id:getInput("dc_gch_id")}),Hash)}
        {renderInputAction("Create Channel","discord-api","create_guild_channel",[{key:"dc_cch_gid",placeholder:"Server ID"},{key:"dc_cch_name",placeholder:"Channel name"}],()=>({guild_id:getInput("dc_cch_gid"),name:getInput("dc_cch_name")}),Hash)}
        {renderInputAction("Invites","discord-api","get_guild_invites",[{key:"dc_inv_gid",placeholder:"Server ID"}],()=>({guild_id:getInput("dc_inv_gid")}),Link2)}
        {renderInputAction("Audit Log","discord-api","get_audit_log",[{key:"dc_al_gid",placeholder:"Server ID"}],()=>({guild_id:getInput("dc_al_gid"),limit:50}),Activity)}
      </TabsContent>
      <TabsContent value="members" className="space-y-2 mt-3">
        {renderInputAction("List Members","discord-api","get_guild_members",[{key:"dc_mem_gid",placeholder:"Server ID"}],()=>({guild_id:getInput("dc_mem_gid"),limit:100}),Users)}
        {renderInputAction("Kick","discord-api","kick_member",[{key:"dc_kick_gid",placeholder:"Server ID"},{key:"dc_kick_uid",placeholder:"User ID"}],()=>({guild_id:getInput("dc_kick_gid"),user_id:getInput("dc_kick_uid")}),UserMinus)}
        {renderInputAction("Ban","discord-api","ban_member",[{key:"dc_ban_gid",placeholder:"Server ID"},{key:"dc_ban_uid",placeholder:"User ID"}],()=>({guild_id:getInput("dc_ban_gid"),user_id:getInput("dc_ban_uid")}),Shield)}
        {renderInputAction("Unban","discord-api","unban_member",[{key:"dc_unban_gid",placeholder:"Server ID"},{key:"dc_unban_uid",placeholder:"User ID"}],()=>({guild_id:getInput("dc_unban_gid"),user_id:getInput("dc_unban_uid")}),UserPlus)}
        {renderInputAction("Add Role","discord-api","add_member_role",[{key:"dc_ar_gid",placeholder:"Server ID"},{key:"dc_ar_uid",placeholder:"User ID"},{key:"dc_ar_rid",placeholder:"Role ID"}],()=>({guild_id:getInput("dc_ar_gid"),user_id:getInput("dc_ar_uid"),role_id:getInput("dc_ar_rid")}),Award)}
      </TabsContent>
      <TabsContent value="roles" className="space-y-2 mt-3">
        {renderInputAction("List Roles","discord-api","get_roles",[{key:"dc_roles_gid",placeholder:"Server ID"}],()=>({guild_id:getInput("dc_roles_gid")}),Shield)}
        {renderInputAction("Create Role","discord-api","create_role",[{key:"dc_cr_gid",placeholder:"Server ID"},{key:"dc_cr_name",placeholder:"Role name"}],()=>({guild_id:getInput("dc_cr_gid"),name:getInput("dc_cr_name")}),Shield)}
        {renderInputAction("Delete Role","discord-api","delete_role",[{key:"dc_dr_gid",placeholder:"Server ID"},{key:"dc_dr_rid",placeholder:"Role ID"}],()=>({guild_id:getInput("dc_dr_gid"),role_id:getInput("dc_dr_rid")}),Trash2)}
      </TabsContent>
      <TabsContent value="channels" className="space-y-2 mt-3">
        {renderInputAction("Get Channel","discord-api","get_channel",[{key:"dc_ch_id",placeholder:"Channel ID"}],()=>({channel_id:getInput("dc_ch_id")}),Hash)}
        {renderInputAction("Modify Channel","discord-api","modify_channel",[{key:"dc_mch_id",placeholder:"Channel ID"},{key:"dc_mch_name",placeholder:"New name"},{key:"dc_mch_topic",placeholder:"Topic"}],()=>({channel_id:getInput("dc_mch_id"),name:getInput("dc_mch_name"),topic:getInput("dc_mch_topic")}),Settings)}
        {renderInputAction("Delete Channel","discord-api","delete_channel",[{key:"dc_dch_id",placeholder:"Channel ID"}],()=>({channel_id:getInput("dc_dch_id")}),Trash2)}
        {renderInputAction("Create Thread","discord-api","create_thread",[{key:"dc_thr_ch",placeholder:"Channel ID"},{key:"dc_thr_name",placeholder:"Thread name"}],()=>({channel_id:getInput("dc_thr_ch"),name:getInput("dc_thr_name")}),Layers)}
        {renderInputAction("Active Threads","discord-api","get_active_threads",[{key:"dc_at_gid",placeholder:"Server ID"}],()=>({guild_id:getInput("dc_at_gid")}),Layers)}
      </TabsContent>
      <TabsContent value="webhooks" className="space-y-2 mt-3">
        {renderInputAction("Server Webhooks","discord-api","get_guild_webhooks",[{key:"dc_wh_gid",placeholder:"Server ID"}],()=>({guild_id:getInput("dc_wh_gid")}),Zap)}
        {renderInputAction("Create Webhook","discord-api","create_webhook",[{key:"dc_cwh_ch",placeholder:"Channel ID"},{key:"dc_cwh_name",placeholder:"Name"}],()=>({channel_id:getInput("dc_cwh_ch"),name:getInput("dc_cwh_name")}),Zap)}
        {renderInputAction("Execute Webhook","discord-api","execute_webhook",[{key:"dc_ewh_id",placeholder:"Webhook ID"},{key:"dc_ewh_token",placeholder:"Webhook Token"},{key:"dc_ewh_content",placeholder:"Message"}],()=>({webhook_id:getInput("dc_ewh_id"),webhook_token:getInput("dc_ewh_token"),content:getInput("dc_ewh_content")}),Send)}
      </TabsContent>
      <TabsContent value="events" className="space-y-2 mt-3">
        {renderInputAction("Server Events","discord-api","get_guild_events",[{key:"dc_ev_gid",placeholder:"Server ID"}],()=>({guild_id:getInput("dc_ev_gid")}),Clock)}
        {renderInputAction("Create Event","discord-api","create_guild_event",[{key:"dc_cev_gid",placeholder:"Server ID"},{key:"dc_cev_name",placeholder:"Name"},{key:"dc_cev_start",placeholder:"Start (ISO)"},{key:"dc_cev_loc",placeholder:"Location"}],()=>({guild_id:getInput("dc_cev_gid"),name:getInput("dc_cev_name"),start_time:getInput("dc_cev_start"),location:getInput("dc_cev_loc")}),Clock)}
        {renderInputAction("Emojis","discord-api","get_guild_emojis",[{key:"dc_em_gid",placeholder:"Server ID"}],()=>({guild_id:getInput("dc_em_gid")}),Star)}
        {renderInputAction("AutoMod Rules","discord-api","get_automod_rules",[{key:"dc_am_gid",placeholder:"Server ID"}],()=>({guild_id:getInput("dc_am_gid")}),Shield)}
      </TabsContent>
      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Announcement","social-ai-responder","generate_caption",[{key:"ai_dc_topic",placeholder:"Topic"}],()=>({topic:getInput("ai_dc_topic"),platform:"discord",include_cta:true}),Brain)}
        {renderInputAction("AI Auto-Reply","social-ai-responder","generate_dm_reply",[{key:"ai_dc_msg",placeholder:"Message to reply..."}],()=>({message_text:getInput("ai_dc_msg"),sender_name:"member"}),Zap)}
        {renderInputAction("AI Welcome Message","social-ai-responder","generate_caption",[{key:"ai_dc_welcome",placeholder:"Server theme/purpose"}],()=>({topic:`Write a Discord server welcome message with rules and channel guide for: ${getInput("ai_dc_welcome")}`,platform:"discord",include_cta:false}),UserPlus)}
        {renderInputAction("AI Mod Response","social-ai-responder","generate_dm_reply",[{key:"ai_dc_mod",placeholder:"Rule violation context..."}],()=>({message_text:`Moderator response needed: ${getInput("ai_dc_mod")}`,sender_name:"moderator"}),Shield)}
        {renderInputAction("AI Event Post","social-ai-responder","generate_caption",[{key:"ai_dc_event",placeholder:"Event details"}],()=>({topic:`Write a Discord server event announcement with date, time, and hype for: ${getInput("ai_dc_event")}`,platform:"discord",include_cta:true}),Calendar)}
        {renderInputAction("AI Channel Description","social-ai-responder","generate_caption",[{key:"ai_dc_ch_desc",placeholder:"Channel purpose"}],()=>({topic:`Write a Discord channel topic/description for: ${getInput("ai_dc_ch_desc")}`,platform:"discord",include_cta:false}),Hash)}
        {renderInputAction("AI Server Rules","social-ai-responder","generate_caption",[{key:"ai_dc_rules",placeholder:"Server type/community"}],()=>({topic:`Write 10 Discord server rules for a community about: ${getInput("ai_dc_rules")}`,platform:"discord",include_cta:false}),Flag)}
        {renderInputAction("AI Engagement Activity","social-ai-responder","generate_caption",[{key:"ai_dc_engage",placeholder:"Community niche"}],()=>({topic:`Generate 5 Discord community engagement activities (polls, games, challenges) for: ${getInput("ai_dc_engage")}`,platform:"discord",include_cta:false}),Star)}
      </TabsContent>
    </Tabs>
  );

  // ===== FACEBOOK =====
  const renderFacebookContent = () => (
    <Tabs defaultValue="pages" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[{v:"pages",l:"Pages",icon:Globe},{v:"posts",l:"Posts",icon:FileText},{v:"publish",l:"Publish",icon:Send},{v:"comments",l:"Comments",icon:MessageSquare},{v:"groups",l:"Groups",icon:Users},{v:"inbox",l:"Inbox",icon:MessageCircle},{v:"insights",l:"Insights",icon:BarChart3},{v:"ai",l:"AI",icon:Brain}].map(t=>(
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background"><t.icon className="h-3 w-3"/>{t.l}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="pages" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("Profile","facebook-api","get_profile",{},Users)}
          {renderActionButton("My Pages","facebook-api","get_pages",{limit:25},Globe)}
        </div>
        {renderInputAction("Get Page","facebook-api","get_page",[{key:"fb_pg_id",placeholder:"Page ID"}],()=>({page_id:getInput("fb_pg_id")}),Eye)}
        {renderInputAction("Search Pages","facebook-api","search_pages",[{key:"fb_sp_q",placeholder:"Search query"}],()=>({query:getInput("fb_sp_q"),limit:10}),Search)}
      </TabsContent>
      <TabsContent value="posts" className="space-y-2 mt-3">
        {renderActionButton("My Feed","facebook-api","get_feed",{limit:25},FileText)}
        {renderInputAction("Page Feed","facebook-api","get_feed",[{key:"fb_pf_id",placeholder:"Page ID"}],()=>({page_id:getInput("fb_pf_id"),limit:25}),FileText)}
        {renderInputAction("Get Post","facebook-api","get_post",[{key:"fb_gp_id",placeholder:"Post ID"}],()=>({post_id:getInput("fb_gp_id")}),Eye)}
        {renderInputAction("Delete Post","facebook-api","delete_post",[{key:"fb_dp_id",placeholder:"Post ID"}],()=>({post_id:getInput("fb_dp_id")}),Trash2)}
      </TabsContent>
      <TabsContent value="publish" className="space-y-2 mt-3">
        {renderInputAction("Text Post","facebook-api","create_post",[{key:"fb_cp_msg",placeholder:"Message"},{key:"fb_cp_pid",placeholder:"Page ID (opt)"}],()=>({message:getInput("fb_cp_msg"),page_id:getInput("fb_cp_pid")||undefined}),Send)}
        {renderInputAction("Link Post","facebook-api","create_post",[{key:"fb_lp_msg",placeholder:"Message"},{key:"fb_lp_link",placeholder:"URL"},{key:"fb_lp_pid",placeholder:"Page ID (opt)"}],()=>({message:getInput("fb_lp_msg"),link:getInput("fb_lp_link"),page_id:getInput("fb_lp_pid")||undefined}),Link2)}
        {renderInputAction("Photo Post","facebook-api","create_photo_post",[{key:"fb_pp_url",placeholder:"Image URL"},{key:"fb_pp_cap",placeholder:"Caption"},{key:"fb_pp_pid",placeholder:"Page ID (opt)"}],()=>({image_url:getInput("fb_pp_url"),caption:getInput("fb_pp_cap"),page_id:getInput("fb_pp_pid")||undefined}),Image)}
        {renderInputAction("Video Post","facebook-api","create_video_post",[{key:"fb_vp_url",placeholder:"Video URL"},{key:"fb_vp_desc",placeholder:"Description"},{key:"fb_vp_pid",placeholder:"Page ID (opt)"}],()=>({video_url:getInput("fb_vp_url"),description:getInput("fb_vp_desc"),page_id:getInput("fb_vp_pid")||undefined}),Video)}
      </TabsContent>
      <TabsContent value="comments" className="space-y-2 mt-3">
        {renderInputAction("Get Comments","facebook-api","get_comments",[{key:"fb_gc_oid",placeholder:"Post/Object ID"}],()=>({object_id:getInput("fb_gc_oid"),limit:50}),MessageSquare)}
        {renderInputAction("Post Comment","facebook-api","post_comment",[{key:"fb_pc_oid",placeholder:"Post ID"},{key:"fb_pc_msg",placeholder:"Comment..."}],()=>({object_id:getInput("fb_pc_oid"),message:getInput("fb_pc_msg")}),Send)}
        {renderInputAction("Delete Comment","facebook-api","delete_comment",[{key:"fb_dc_id",placeholder:"Comment ID"}],()=>({comment_id:getInput("fb_dc_id")}),Trash2)}
        {renderInputAction("Hide Comment","facebook-api","hide_comment",[{key:"fb_hc_id",placeholder:"Comment ID"}],()=>({comment_id:getInput("fb_hc_id")}),EyeOff)}
        {renderInputAction("Get Reactions","facebook-api","get_reactions",[{key:"fb_gr_oid",placeholder:"Post/Object ID"}],()=>({object_id:getInput("fb_gr_oid"),limit:50}),Heart)}
      </TabsContent>
      <TabsContent value="groups" className="space-y-2 mt-3">
        {renderActionButton("My Groups","facebook-api","get_groups",{limit:25},Users)}
        {renderInputAction("Group Feed","facebook-api","get_group_feed",[{key:"fb_gf_id",placeholder:"Group ID"}],()=>({group_id:getInput("fb_gf_id"),limit:25}),FileText)}
        {renderInputAction("Post to Group","facebook-api","post_to_group",[{key:"fb_pg_gid",placeholder:"Group ID"},{key:"fb_pg_msg",placeholder:"Message"}],()=>({group_id:getInput("fb_pg_gid"),message:getInput("fb_pg_msg")}),Send)}
        {renderInputAction("Events","facebook-api","get_events",[{key:"fb_ev_pid",placeholder:"Page ID (opt)"}],()=>({page_id:getInput("fb_ev_pid")||undefined}),Calendar)}
        {renderInputAction("Albums","facebook-api","get_albums",[{key:"fb_al_pid",placeholder:"Page ID (opt)"}],()=>({page_id:getInput("fb_al_pid")||undefined}),Image)}
      </TabsContent>
      <TabsContent value="inbox" className="space-y-2 mt-3">
        {renderInputAction("Page Conversations","facebook-api","get_conversations",[{key:"fb_cv_pid",placeholder:"Page ID"}],()=>({page_id:getInput("fb_cv_pid"),limit:20}),MessageCircle)}
        {renderInputAction("Conversation Messages","facebook-api","get_conversation_messages",[{key:"fb_cm_cid",placeholder:"Conversation ID"}],()=>({conversation_id:getInput("fb_cm_cid"),limit:20}),MessageSquare)}
        {renderInputAction("Send Page Message","facebook-api","send_page_message",[{key:"fb_sm_pid",placeholder:"Page ID"},{key:"fb_sm_rid",placeholder:"Recipient ID"},{key:"fb_sm_msg",placeholder:"Message"}],()=>({page_id:getInput("fb_sm_pid"),recipient_id:getInput("fb_sm_rid"),message:getInput("fb_sm_msg")}),Send)}
      </TabsContent>
      <TabsContent value="insights" className="space-y-2 mt-3">
        {renderInputAction("Page Insights","facebook-api","get_page_insights",[{key:"fb_pi_pid",placeholder:"Page ID"}],()=>({page_id:getInput("fb_pi_pid")}),BarChart3)}
        {renderInputAction("Post Insights","facebook-api","get_post_insights",[{key:"fb_poi_pid",placeholder:"Post ID"}],()=>({post_id:getInput("fb_poi_pid")}),TrendingUp)}
      </TabsContent>
      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Post","social-ai-responder","generate_caption",[{key:"ai_fb_topic",placeholder:"Topic"}],()=>({topic:getInput("ai_fb_topic"),platform:"facebook",include_cta:true}),Brain)}
        {renderInputAction("AI Comment Reply","social-ai-responder","generate_dm_reply",[{key:"ai_fb_cmt",placeholder:"Comment text..."}],()=>({message_text:getInput("ai_fb_cmt"),sender_name:"user"}),Zap)}
        {renderInputAction("AI Page Bio","social-ai-responder","generate_caption",[{key:"ai_fb_bio",placeholder:"Describe your page/brand"}],()=>({topic:`Write a compelling Facebook page About section for: ${getInput("ai_fb_bio")}`,platform:"facebook",include_cta:false}),Users)}
        {renderInputAction("AI DM Auto-Reply","social-ai-responder","generate_dm_reply",[{key:"ai_fb_dm",placeholder:"Incoming message..."}],()=>({message_text:getInput("ai_fb_dm"),sender_name:"visitor"}),Send)}
        {renderInputAction("AI Ad Copy","social-ai-responder","generate_caption",[{key:"ai_fb_ad",placeholder:"Product/service to promote"}],()=>({topic:`Write Facebook ad copy with headline, primary text, and description for: ${getInput("ai_fb_ad")}`,platform:"facebook",include_cta:true}),Megaphone)}
        {renderInputAction("AI Group Post","social-ai-responder","generate_caption",[{key:"ai_fb_grp",placeholder:"Group topic"}],()=>({topic:`Write an engaging Facebook group post that sparks discussion about: ${getInput("ai_fb_grp")}`,platform:"facebook",include_cta:false}),Users)}
        {renderInputAction("AI Event Description","social-ai-responder","generate_caption",[{key:"ai_fb_evt",placeholder:"Event details"}],()=>({topic:`Write a Facebook event description with details and RSVP CTA for: ${getInput("ai_fb_evt")}`,platform:"facebook",include_cta:true}),Calendar)}
        {renderInputAction("AI Carousel Ideas","social-ai-responder","generate_caption",[{key:"ai_fb_car",placeholder:"Topic for carousel"}],()=>({topic:`Write 5-slide Facebook carousel post content with headlines and descriptions for: ${getInput("ai_fb_car")}`,platform:"facebook",include_cta:true}),Layers)}
        {renderInputAction("AI Hashtag Strategy","social-ai-responder","generate_caption",[{key:"ai_fb_ht",placeholder:"Niche/industry"}],()=>({topic:`Generate 15 Facebook hashtags for maximum reach in: ${getInput("ai_fb_ht")}`,platform:"facebook",include_cta:false}),Hash)}
      </TabsContent>
    </Tabs>
  );

  const renderPlatformContent = (platformId: string) => {
    switch (platformId) {
      case "instagram": return renderInstagramContent();
      case "twitter": return renderTwitterContent();
      case "reddit": return renderRedditContent();
      case "telegram": return renderTelegramContent();
      case "tiktok": return renderTikTokContent();
      case "snapchat": return renderSnapchatContent();
      case "threads": return renderThreadsContent();
      case "whatsapp": return renderWhatsAppContent();
      case "signal": return renderSignalContent();
      case "youtube": return renderYouTubeContent();
      case "pinterest": return renderPinterestContent();
      case "discord": return renderDiscordContent();
      case "facebook": return renderFacebookContent();
      default: return null;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Social Networks API Hub</h3>
          <Badge variant="outline" className="text-[10px]">13 platforms</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {platforms.map(p => {
          const connected = isConnected(p.id);
          return (
            <Card key={p.id} className={`transition-all cursor-pointer ${
              connected
                ? "border-green-500/40 bg-green-500/5 hover:border-green-400/60 hover:bg-green-500/10"
                : "border-red-500/30 bg-red-500/5 hover:border-red-400/50 hover:bg-red-500/10"
            } ${expandedPlatform === p.id ? p.borderColor : ""}`}>
              <button
                onClick={() => handlePlatformClick(p.id)}
                className="w-full p-3 flex items-center gap-3 transition-colors rounded-xl"
              >
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${connected ? p.bgColor + " " + p.color : "bg-red-500/10 text-red-400"}`}>
                  <p.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className={`text-sm font-semibold ${connected ? "text-foreground" : "text-red-300"}`}>{p.name}</p>
                  <p className={`text-[10px] ${connected ? "text-green-400" : "text-red-400"}`}>
                    {connected ? "✅ Connected · Full API · AI Automation Ready" : "⛔ Not connected — Click to set up in Connect tab"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {connected ? (
                    <Badge className="bg-green-500/20 text-green-400 text-[10px] border-green-500/40">● Live</Badge>
                  ) : (
                    <Badge className="bg-red-500/20 text-red-400 text-[10px] border-red-500/40"><AlertCircle className="h-3 w-3 mr-0.5" />Disconnected</Badge>
                  )}
                  <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expandedPlatform === p.id ? "rotate-90" : ""}`} />
                </div>
              </button>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!expandedPlatform} onOpenChange={(open) => { if (!open) setExpandedPlatform(null); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {expandedPlatform && (() => {
                const p = platforms.find(pl => pl.id === expandedPlatform);
                if (!p) return null;
                return (<><p.icon className={`h-5 w-5 ${p.color}`} />{p.name} — Full API Control Center</>);
              })()}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[calc(85vh-100px)] pr-2">
            {expandedPlatform && renderPlatformContent(expandedPlatform)}
            {result && (
              <Card className="mt-4 border-primary/20">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-foreground">API Response</p>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => { navigator.clipboard.writeText(JSON.stringify(result, null, 2)); toast.success("Copied"); }}><Copy className="h-3 w-3 mr-1" />Copy</Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setResult(null)}><Trash2 className="h-3 w-3 mr-1" />Clear</Button>
                    </div>
                  </div>
                  <pre className="text-[10px] text-muted-foreground bg-muted/50 rounded p-2 overflow-auto max-h-[300px] whitespace-pre-wrap break-all">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SocialNetworksTab;

import { useState } from "react";
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
} from "lucide-react";

interface Props {
  selectedAccount: string;
}

const SocialNetworksTab = ({ selectedAccount }: Props) => {
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const setInput = (key: string, val: string) => setInputValues(p => ({ ...p, [key]: val }));
  const getInput = (key: string) => inputValues[key] || "";

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
  ];

  const renderActionButton = (label: string, funcName: string, action: string, params: any = {}, icon?: any) => {
    const Icon = icon || Zap;
    return (
      <Button size="sm" variant="outline" onClick={() => callApi(funcName, action, params)} disabled={loading} className="text-xs h-8 gap-1">
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
          <Button size="sm" variant="default" onClick={() => callApi(funcName, action, buildParams())} disabled={loading} className="text-xs h-7 gap-1">
            {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />}Go
          </Button>
        </div>
      </div>
    );
  };

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
        {renderInputAction("AI Tweet","social-ai-responder","generate_caption",[{key:"ai_x_topic",placeholder:"Topic"}],()=>({topic:getInput("ai_x_topic"),platform:"twitter",include_cta:true}),Brain)}
        {renderInputAction("AI Reply","social-ai-responder","generate_dm_reply",[{key:"ai_x_mention",placeholder:"Mention text..."}],()=>({message_text:getInput("ai_x_mention"),sender_name:"mention"}),Zap)}
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
        {renderInputAction("AI Thread","social-ai-responder","generate_caption",[{key:"ai_th_topic",placeholder:"Topic"}],()=>({topic:getInput("ai_th_topic"),platform:"threads",include_cta:true}),Brain)}
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
      </TabsContent>
    </Tabs>
  );

  const renderPlatformContent = (platformId: string) => {
    switch (platformId) {
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
      default: return null;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Social Networks API Hub</h3>
          <Badge variant="outline" className="text-[10px]">11 platforms</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {platforms.map(p => (
          <Card key={p.id} className={`transition-all cursor-pointer hover:border-primary/30 ${expandedPlatform === p.id ? p.borderColor : ""}`}>
            <button
              onClick={() => setExpandedPlatform(expandedPlatform === p.id ? null : p.id)}
              className="w-full p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors rounded-xl"
            >
              <div className={`h-10 w-10 rounded-lg ${p.bgColor} flex items-center justify-center ${p.color}`}>
                <p.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">{p.name}</p>
                <p className="text-[10px] text-muted-foreground">Full API · AI tools</p>
              </div>
              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expandedPlatform === p.id ? "rotate-90" : ""}`} />
            </button>
          </Card>
        ))}
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

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Twitter, Globe, Phone, Music2, ChevronRight, RefreshCw,
  MessageSquare, Send, Search, Users, Heart, Repeat, Bookmark,
  List, Radio, Eye, EyeOff, TrendingUp, Hash, Shield, Bot,
  Megaphone, FileText, Settings, Zap, Brain, Star, Target,
  ArrowUp, ArrowDown, Lock, Unlock, Pin, PinOff, UserPlus, UserMinus,
  Volume2, Image, Video, MapPin, Dice1, Forward, Copy, Trash2,
  Bell, BellOff, Link2, Upload, Play, BarChart3, Activity,
  FolderOpen, Award, Flag, Filter, Layers, Briefcase, Clock,
} from "lucide-react";

interface Props {
  selectedAccount: string;
}

const SocialNetworksTab = ({ selectedAccount }: Props) => {
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Shared form state
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
    {
      id: "twitter",
      name: "X / Twitter",
      icon: Twitter,
      color: "text-blue-400",
      borderColor: "border-blue-500/30",
      bgColor: "bg-blue-500/10",
      funcName: "twitter-api",
    },
    {
      id: "reddit",
      name: "Reddit",
      icon: Globe,
      color: "text-orange-400",
      borderColor: "border-orange-500/30",
      bgColor: "bg-orange-500/10",
      funcName: "reddit-api",
    },
    {
      id: "telegram",
      name: "Telegram",
      icon: Phone,
      color: "text-sky-400",
      borderColor: "border-sky-500/30",
      bgColor: "bg-sky-500/10",
      funcName: "telegram-api",
    },
    {
      id: "tiktok",
      name: "TikTok",
      icon: Music2,
      color: "text-cyan-400",
      borderColor: "border-cyan-500/30",
      bgColor: "bg-cyan-500/10",
      funcName: "tiktok-api",
    },
  ];

  const renderActionButton = (label: string, funcName: string, action: string, params: any = {}, icon?: any) => {
    const Icon = icon || Zap;
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => callApi(funcName, action, params)}
        disabled={loading}
        className="text-xs h-8 gap-1"
      >
        <Icon className="h-3 w-3" />
        {label}
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
            <Input
              key={ik.key}
              value={getInput(ik.key)}
              onChange={e => setInput(ik.key, e.target.value)}
              placeholder={ik.placeholder}
              type={ik.type || "text"}
              className="text-xs h-7 flex-1 min-w-[120px]"
            />
          ))}
          <Button
            size="sm"
            variant="default"
            onClick={() => callApi(funcName, action, buildParams())}
            disabled={loading}
            className="text-xs h-7 gap-1"
          >
            {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />}
            Go
          </Button>
        </div>
      </div>
    );
  };

  const renderTwitterContent = () => (
    <Tabs defaultValue="tweets" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[
          { v: "tweets", l: "Tweets", icon: MessageSquare },
          { v: "engage", l: "Engage", icon: Heart },
          { v: "social", l: "Social", icon: Users },
          { v: "dms", l: "DMs", icon: Send },
          { v: "lists", l: "Lists", icon: List },
          { v: "search", l: "Search", icon: Search },
          { v: "spaces", l: "Spaces", icon: Radio },
          { v: "ai", l: "AI Auto", icon: Brain },
        ].map(t => (
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background">
            <t.icon className="h-3 w-3" />{t.l}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="tweets" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("My Tweets", "twitter-api", "get_tweets", { limit: 20 }, MessageSquare)}
          {renderActionButton("Timeline", "twitter-api", "get_home_timeline", { limit: 20 }, Layers)}
          {renderActionButton("Mentions", "twitter-api", "get_mentions", { limit: 20 }, Bell)}
        </div>
        {renderInputAction("Create Tweet", "twitter-api", "create_tweet", [
          { key: "tweet_text", placeholder: "What's happening?" },
        ], () => ({ text: getInput("tweet_text") }), Send)}
        {renderInputAction("Reply to Tweet", "twitter-api", "create_tweet", [
          { key: "reply_to_id", placeholder: "Tweet ID to reply to" },
          { key: "reply_text", placeholder: "Your reply..." },
        ], () => ({ text: getInput("reply_text"), reply_to: getInput("reply_to_id") }), MessageSquare)}
        {renderInputAction("Quote Tweet", "twitter-api", "create_tweet", [
          { key: "qt_id", placeholder: "Tweet ID to quote" },
          { key: "qt_text", placeholder: "Your comment..." },
        ], () => ({ text: getInput("qt_text"), quote_tweet_id: getInput("qt_id") }), Repeat)}
        {renderInputAction("Delete Tweet", "twitter-api", "delete_tweet", [
          { key: "del_tweet_id", placeholder: "Tweet ID" },
        ], () => ({ tweet_id: getInput("del_tweet_id") }), Trash2)}
        {renderInputAction("Get Tweet by ID", "twitter-api", "get_tweet_by_id", [
          { key: "view_tweet_id", placeholder: "Tweet ID" },
        ], () => ({ tweet_id: getInput("view_tweet_id") }), Eye)}
        {renderInputAction("Get Quote Tweets", "twitter-api", "get_quote_tweets", [
          { key: "qt_source_id", placeholder: "Tweet ID" },
        ], () => ({ tweet_id: getInput("qt_source_id") }), Repeat)}
        {renderInputAction("Tweet Counts", "twitter-api", "get_tweet_counts", [
          { key: "tc_query", placeholder: "Search query" },
        ], () => ({ query: getInput("tc_query"), granularity: "day" }), BarChart3)}
        {renderInputAction("Hide Reply", "twitter-api", "hide_reply", [
          { key: "hide_tweet_id", placeholder: "Tweet ID" },
        ], () => ({ tweet_id: getInput("hide_tweet_id") }), EyeOff)}
      </TabsContent>

      <TabsContent value="engage" className="space-y-2 mt-3">
        {renderInputAction("Like Tweet", "twitter-api", "like_tweet", [
          { key: "like_id", placeholder: "Tweet ID" },
        ], () => ({ tweet_id: getInput("like_id") }), Heart)}
        {renderInputAction("Unlike Tweet", "twitter-api", "unlike_tweet", [
          { key: "unlike_id", placeholder: "Tweet ID" },
        ], () => ({ tweet_id: getInput("unlike_id") }), Heart)}
        {renderInputAction("Retweet", "twitter-api", "retweet", [
          { key: "rt_id", placeholder: "Tweet ID" },
        ], () => ({ tweet_id: getInput("rt_id") }), Repeat)}
        {renderInputAction("Unretweet", "twitter-api", "unretweet", [
          { key: "urt_id", placeholder: "Tweet ID" },
        ], () => ({ tweet_id: getInput("urt_id") }), Repeat)}
        {renderInputAction("Bookmark Tweet", "twitter-api", "bookmark_tweet", [
          { key: "bm_id", placeholder: "Tweet ID" },
        ], () => ({ tweet_id: getInput("bm_id") }), Bookmark)}
        {renderInputAction("Remove Bookmark", "twitter-api", "remove_bookmark", [
          { key: "ubm_id", placeholder: "Tweet ID" },
        ], () => ({ tweet_id: getInput("ubm_id") }), Bookmark)}
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("My Likes", "twitter-api", "get_liked_tweets", { limit: 20 }, Heart)}
          {renderActionButton("My Bookmarks", "twitter-api", "get_bookmarks", { limit: 20 }, Bookmark)}
        </div>
        {renderInputAction("Who Liked", "twitter-api", "get_liking_users", [
          { key: "wl_id", placeholder: "Tweet ID" },
        ], () => ({ tweet_id: getInput("wl_id") }), Users)}
        {renderInputAction("Who Retweeted", "twitter-api", "get_retweeters", [
          { key: "wr_id", placeholder: "Tweet ID" },
        ], () => ({ tweet_id: getInput("wr_id") }), Users)}
      </TabsContent>

      <TabsContent value="social" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("My Profile", "twitter-api", "get_profile", {}, Users)}
          {renderActionButton("Followers", "twitter-api", "get_followers", { limit: 100 }, Users)}
          {renderActionButton("Following", "twitter-api", "get_following", { limit: 100 }, UserPlus)}
          {renderActionButton("Muted", "twitter-api", "get_muted_users", { limit: 100 }, Volume2)}
          {renderActionButton("Blocked", "twitter-api", "get_blocked_users", { limit: 100 }, Shield)}
        </div>
        {renderInputAction("Lookup User", "twitter-api", "get_user_by_username", [
          { key: "x_lookup_user", placeholder: "Username (without @)" },
        ], () => ({ username: getInput("x_lookup_user") }), Search)}
        {renderInputAction("Follow User", "twitter-api", "follow_user", [
          { key: "follow_uid", placeholder: "User ID" },
        ], () => ({ target_user_id: getInput("follow_uid") }), UserPlus)}
        {renderInputAction("Unfollow User", "twitter-api", "unfollow_user", [
          { key: "unfollow_uid", placeholder: "User ID" },
        ], () => ({ target_user_id: getInput("unfollow_uid") }), UserMinus)}
        {renderInputAction("Mute User", "twitter-api", "mute_user", [
          { key: "mute_uid", placeholder: "User ID" },
        ], () => ({ target_user_id: getInput("mute_uid") }), Volume2)}
        {renderInputAction("Block User", "twitter-api", "block_user", [
          { key: "block_uid", placeholder: "User ID" },
        ], () => ({ target_user_id: getInput("block_uid") }), Shield)}
      </TabsContent>

      <TabsContent value="dms" className="space-y-2 mt-3">
        {renderActionButton("Get DM Events", "twitter-api", "get_dm_events", { limit: 20 }, MessageSquare)}
        {renderInputAction("Get Conversation", "twitter-api", "get_dm_conversation", [
          { key: "dm_conv_id", placeholder: "Conversation ID" },
        ], () => ({ conversation_id: getInput("dm_conv_id") }), MessageSquare)}
        {renderInputAction("DMs with User", "twitter-api", "get_dm_conversation_with_user", [
          { key: "dm_part_id", placeholder: "Participant User ID" },
        ], () => ({ participant_id: getInput("dm_part_id") }), Users)}
        {renderInputAction("Send DM", "twitter-api", "send_dm", [
          { key: "dm_to", placeholder: "Recipient User ID" },
          { key: "dm_text", placeholder: "Message..." },
        ], () => ({ recipient_id: getInput("dm_to"), text: getInput("dm_text") }), Send)}
      </TabsContent>

      <TabsContent value="lists" className="space-y-2 mt-3">
        {renderActionButton("My Lists", "twitter-api", "get_owned_lists", { limit: 25 }, List)}
        {renderInputAction("Create List", "twitter-api", "create_list", [
          { key: "list_name", placeholder: "List name" },
          { key: "list_desc", placeholder: "Description" },
        ], () => ({ name: getInput("list_name"), description: getInput("list_desc") }), List)}
        {renderInputAction("Get List Tweets", "twitter-api", "get_list_tweets", [
          { key: "lt_id", placeholder: "List ID" },
        ], () => ({ list_id: getInput("lt_id") }), MessageSquare)}
        {renderInputAction("List Members", "twitter-api", "get_list_members", [
          { key: "lm_id", placeholder: "List ID" },
        ], () => ({ list_id: getInput("lm_id") }), Users)}
        {renderInputAction("Add to List", "twitter-api", "add_list_member", [
          { key: "al_list_id", placeholder: "List ID" },
          { key: "al_user_id", placeholder: "User ID" },
        ], () => ({ list_id: getInput("al_list_id"), user_id: getInput("al_user_id") }), UserPlus)}
        {renderInputAction("Remove from List", "twitter-api", "remove_list_member", [
          { key: "rl_list_id", placeholder: "List ID" },
          { key: "rl_user_id", placeholder: "User ID" },
        ], () => ({ list_id: getInput("rl_list_id"), user_id: getInput("rl_user_id") }), UserMinus)}
        {renderInputAction("Delete List", "twitter-api", "delete_list", [
          { key: "dl_id", placeholder: "List ID" },
        ], () => ({ list_id: getInput("dl_id") }), Trash2)}
      </TabsContent>

      <TabsContent value="search" className="space-y-2 mt-3">
        {renderInputAction("Search Tweets (Recent)", "twitter-api", "search", [
          { key: "x_search_q", placeholder: "Search query..." },
        ], () => ({ query: getInput("x_search_q"), limit: 20 }), Search)}
        {renderInputAction("Search All Tweets", "twitter-api", "search_all", [
          { key: "x_search_all_q", placeholder: "Search query (Academic)" },
        ], () => ({ query: getInput("x_search_all_q"), limit: 10 }), Search)}
        {renderInputAction("Search Users", "twitter-api", "search_users", [
          { key: "x_user_search", placeholder: "Search users..." },
        ], () => ({ query: getInput("x_user_search"), limit: 10 }), Users)}
      </TabsContent>

      <TabsContent value="spaces" className="space-y-2 mt-3">
        {renderInputAction("Get Space", "twitter-api", "get_space", [
          { key: "space_id", placeholder: "Space ID" },
        ], () => ({ space_id: getInput("space_id") }), Radio)}
        {renderInputAction("Search Spaces", "twitter-api", "search_spaces", [
          { key: "space_query", placeholder: "Search query" },
        ], () => ({ query: getInput("space_query"), state: "live" }), Search)}
      </TabsContent>

      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Tweet Generator", "social-ai-responder", "generate_caption", [
          { key: "ai_x_topic", placeholder: "Topic or theme for tweet" },
        ], () => ({ topic: getInput("ai_x_topic"), platform: "twitter", include_cta: true }), Brain)}
        {renderInputAction("AI Auto-Reply to Mention", "social-ai-responder", "generate_dm_reply", [
          { key: "ai_x_mention", placeholder: "Paste mention text..." },
        ], () => ({ message_text: getInput("ai_x_mention"), sender_name: "mention" }), Zap)}
        {renderInputAction("AI Analyze Tweet Performance", "social-ai-responder", "analyze_caption", [
          { key: "ai_x_analyze", placeholder: "Paste tweet text..." },
        ], () => ({ caption: getInput("ai_x_analyze"), platform: "twitter" }), BarChart3)}
      </TabsContent>
    </Tabs>
  );

  const renderRedditContent = () => (
    <Tabs defaultValue="posts" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[
          { v: "posts", l: "Posts", icon: FileText },
          { v: "comments", l: "Comments", icon: MessageSquare },
          { v: "subs", l: "Subreddits", icon: Hash },
          { v: "messages", l: "Messages", icon: Send },
          { v: "mod", l: "Moderation", icon: Shield },
          { v: "profile", l: "Profile", icon: Users },
          { v: "search", l: "Search", icon: Search },
          { v: "ai", l: "AI Auto", icon: Brain },
        ].map(t => (
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background">
            <t.icon className="h-3 w-3" />{t.l}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="posts" className="space-y-2 mt-3">
        {renderActionButton("My Posts", "reddit-api", "get_posts", { limit: 25 }, FileText)}
        {renderInputAction("Submit Text Post", "reddit-api", "submit_post", [
          { key: "r_sub", placeholder: "Subreddit" },
          { key: "r_title", placeholder: "Title" },
          { key: "r_text", placeholder: "Body text" },
        ], () => ({ subreddit: getInput("r_sub"), title: getInput("r_title"), text: getInput("r_text"), kind: "self" }), Send)}
        {renderInputAction("Submit Link Post", "reddit-api", "submit_post", [
          { key: "r_link_sub", placeholder: "Subreddit" },
          { key: "r_link_title", placeholder: "Title" },
          { key: "r_link_url", placeholder: "URL" },
        ], () => ({ subreddit: getInput("r_link_sub"), title: getInput("r_link_title"), url: getInput("r_link_url"), kind: "link" }), Link2)}
        {renderInputAction("Edit Post", "reddit-api", "edit_post", [
          { key: "r_edit_id", placeholder: "Thing ID (t3_xxx)" },
          { key: "r_edit_text", placeholder: "New text" },
        ], () => ({ thing_id: getInput("r_edit_id"), text: getInput("r_edit_text") }), FileText)}
        {renderInputAction("Delete Post", "reddit-api", "delete_post", [
          { key: "r_del_id", placeholder: "Thing ID" },
        ], () => ({ thing_id: getInput("r_del_id") }), Trash2)}
        {renderInputAction("Crosspost", "reddit-api", "crosspost", [
          { key: "r_xp_sub", placeholder: "Target subreddit" },
          { key: "r_xp_title", placeholder: "Title" },
          { key: "r_xp_fullname", placeholder: "Fullname (t3_xxx)" },
        ], () => ({ subreddit: getInput("r_xp_sub"), title: getInput("r_xp_title"), crosspost_fullname: getInput("r_xp_fullname") }), Copy)}
        {renderInputAction("Vote", "reddit-api", "vote", [
          { key: "r_vote_id", placeholder: "Thing ID" },
          { key: "r_vote_dir", placeholder: "1 (up), -1 (down), 0 (none)" },
        ], () => ({ thing_id: getInput("r_vote_id"), direction: parseInt(getInput("r_vote_dir") || "1") }), ArrowUp)}
        {renderInputAction("Save / Unsave", "reddit-api", "save_post", [
          { key: "r_save_id", placeholder: "Thing ID" },
        ], () => ({ thing_id: getInput("r_save_id") }), Bookmark)}
        {renderInputAction("Hide / Mark NSFW / Spoiler", "reddit-api", "hide_post", [
          { key: "r_hide_id", placeholder: "Thing ID" },
        ], () => ({ thing_id: getInput("r_hide_id") }), EyeOff)}
      </TabsContent>

      <TabsContent value="comments" className="space-y-2 mt-3">
        {renderInputAction("Load Comments", "reddit-api", "get_comments", [
          { key: "r_cmt_post", placeholder: "Post ID (without t3_)" },
        ], () => ({ post_id: getInput("r_cmt_post"), limit: 50, sort: "best" }), MessageSquare)}
        {renderInputAction("Reply to Post/Comment", "reddit-api", "submit_comment", [
          { key: "r_reply_id", placeholder: "Thing ID (t3_/t1_)" },
          { key: "r_reply_text", placeholder: "Your reply..." },
        ], () => ({ thing_id: getInput("r_reply_id"), text: getInput("r_reply_text") }), Send)}
        {renderInputAction("Edit Comment", "reddit-api", "edit_comment", [
          { key: "r_ecmt_id", placeholder: "Comment Thing ID" },
          { key: "r_ecmt_text", placeholder: "Updated text..." },
        ], () => ({ thing_id: getInput("r_ecmt_id"), text: getInput("r_ecmt_text") }), FileText)}
        {renderInputAction("Delete Comment", "reddit-api", "delete_comment", [
          { key: "r_dcmt_id", placeholder: "Comment Thing ID" },
        ], () => ({ thing_id: getInput("r_dcmt_id") }), Trash2)}
      </TabsContent>

      <TabsContent value="subs" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("My Subs", "reddit-api", "get_my_subreddits", { limit: 25 }, Hash)}
          {renderActionButton("Popular", "reddit-api", "get_popular_subreddits", { limit: 25 }, TrendingUp)}
          {renderActionButton("New Subs", "reddit-api", "get_new_subreddits", { limit: 25 }, Star)}
          {renderActionButton("Trending", "reddit-api", "get_popular", { limit: 25 }, TrendingUp)}
          {renderActionButton("Best", "reddit-api", "get_best", { limit: 25 }, Award)}
        </div>
        {renderInputAction("Get Subreddit Info", "reddit-api", "get_subreddit", [
          { key: "r_sub_name", placeholder: "Subreddit name" },
        ], () => ({ subreddit: getInput("r_sub_name") }), Hash)}
        {renderInputAction("Subreddit Rules", "reddit-api", "get_subreddit_rules", [
          { key: "r_rules_sub", placeholder: "Subreddit name" },
        ], () => ({ subreddit: getInput("r_rules_sub") }), Shield)}
        {renderInputAction("Hot Posts", "reddit-api", "get_subreddit_hot", [
          { key: "r_hot_sub", placeholder: "Subreddit" },
        ], () => ({ subreddit: getInput("r_hot_sub"), limit: 25 }), TrendingUp)}
        {renderInputAction("New Posts", "reddit-api", "get_subreddit_new", [
          { key: "r_new_sub", placeholder: "Subreddit" },
        ], () => ({ subreddit: getInput("r_new_sub"), limit: 25 }), Clock)}
        {renderInputAction("Top Posts", "reddit-api", "get_subreddit_top", [
          { key: "r_top_sub", placeholder: "Subreddit" },
        ], () => ({ subreddit: getInput("r_top_sub"), limit: 25, time: "day" }), ArrowUp)}
        {renderInputAction("Rising", "reddit-api", "get_subreddit_rising", [
          { key: "r_rise_sub", placeholder: "Subreddit" },
        ], () => ({ subreddit: getInput("r_rise_sub"), limit: 25 }), TrendingUp)}
        {renderInputAction("Subscribe", "reddit-api", "subscribe", [
          { key: "r_sub_join", placeholder: "Subreddit to join" },
        ], () => ({ subreddit: getInput("r_sub_join") }), UserPlus)}
        {renderInputAction("Unsubscribe", "reddit-api", "unsubscribe", [
          { key: "r_sub_leave", placeholder: "Subreddit to leave" },
        ], () => ({ subreddit: getInput("r_sub_leave") }), UserMinus)}
      </TabsContent>

      <TabsContent value="messages" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("Inbox", "reddit-api", "get_inbox", { limit: 25 }, Send)}
          {renderActionButton("Unread", "reddit-api", "get_unread", { limit: 25 }, Bell)}
          {renderActionButton("Sent", "reddit-api", "get_sent", { limit: 25 }, Forward)}
          {renderActionButton("Mark All Read", "reddit-api", "mark_all_read", {}, BellOff)}
        </div>
        {renderInputAction("Send Message", "reddit-api", "send_message", [
          { key: "r_msg_to", placeholder: "Username" },
          { key: "r_msg_subj", placeholder: "Subject" },
          { key: "r_msg_text", placeholder: "Message body..." },
        ], () => ({ to: getInput("r_msg_to"), subject: getInput("r_msg_subj"), text: getInput("r_msg_text") }), Send)}
        {renderInputAction("Reply to Message", "reddit-api", "reply_message", [
          { key: "r_rmsg_id", placeholder: "Thing ID" },
          { key: "r_rmsg_text", placeholder: "Reply..." },
        ], () => ({ thing_id: getInput("r_rmsg_id"), text: getInput("r_rmsg_text") }), MessageSquare)}
      </TabsContent>

      <TabsContent value="mod" className="space-y-2 mt-3">
        {renderInputAction("Mod Queue", "reddit-api", "get_modqueue", [
          { key: "r_mq_sub", placeholder: "Subreddit" },
        ], () => ({ subreddit: getInput("r_mq_sub"), limit: 25 }), Filter)}
        {renderInputAction("Reports", "reddit-api", "get_reports", [
          { key: "r_rpt_sub", placeholder: "Subreddit" },
        ], () => ({ subreddit: getInput("r_rpt_sub"), limit: 25 }), Flag)}
        {renderInputAction("Spam Queue", "reddit-api", "get_spam", [
          { key: "r_spam_sub", placeholder: "Subreddit" },
        ], () => ({ subreddit: getInput("r_spam_sub") }), Shield)}
        {renderInputAction("Mod Log", "reddit-api", "get_modlog", [
          { key: "r_log_sub", placeholder: "Subreddit" },
        ], () => ({ subreddit: getInput("r_log_sub") }), Activity)}
        {renderInputAction("Approve", "reddit-api", "approve", [
          { key: "r_appr_id", placeholder: "Thing ID" },
        ], () => ({ thing_id: getInput("r_appr_id") }), Zap)}
        {renderInputAction("Remove", "reddit-api", "remove", [
          { key: "r_rem_id", placeholder: "Thing ID" },
        ], () => ({ thing_id: getInput("r_rem_id") }), Trash2)}
        {renderInputAction("Lock Post", "reddit-api", "lock", [
          { key: "r_lock_id", placeholder: "Thing ID" },
        ], () => ({ thing_id: getInput("r_lock_id") }), Lock)}
        {renderInputAction("Unlock Post", "reddit-api", "unlock", [
          { key: "r_unlock_id", placeholder: "Thing ID" },
        ], () => ({ thing_id: getInput("r_unlock_id") }), Unlock)}
        {renderInputAction("Sticky Post", "reddit-api", "sticky_post", [
          { key: "r_sticky_id", placeholder: "Thing ID" },
        ], () => ({ thing_id: getInput("r_sticky_id") }), Pin)}
        {renderInputAction("Distinguish", "reddit-api", "distinguish", [
          { key: "r_dist_id", placeholder: "Thing ID" },
        ], () => ({ thing_id: getInput("r_dist_id"), how: "yes" }), Award)}
        {renderInputAction("Report", "reddit-api", "report", [
          { key: "r_report_id", placeholder: "Thing ID" },
          { key: "r_report_reason", placeholder: "Reason" },
        ], () => ({ thing_id: getInput("r_report_id"), reason: getInput("r_report_reason") }), Flag)}
        {renderInputAction("Set Flair", "reddit-api", "select_flair", [
          { key: "r_flair_sub", placeholder: "Subreddit" },
          { key: "r_flair_id", placeholder: "Flair Template ID" },
          { key: "r_flair_link", placeholder: "Link fullname" },
        ], () => ({ subreddit: getInput("r_flair_sub"), flair_id: getInput("r_flair_id"), link: getInput("r_flair_link") }), Star)}
      </TabsContent>

      <TabsContent value="profile" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("My Profile", "reddit-api", "get_profile", {}, Users)}
          {renderActionButton("Karma", "reddit-api", "get_karma", {}, ArrowUp)}
          {renderActionButton("Trophies", "reddit-api", "get_trophies", {}, Award)}
          {renderActionButton("Friends", "reddit-api", "get_friends", {}, Users)}
          {renderActionButton("Blocked", "reddit-api", "get_blocked", {}, Shield)}
          {renderActionButton("Prefs", "reddit-api", "get_prefs", {}, Settings)}
          {renderActionButton("Saved", "reddit-api", "get_user_saved", {}, Bookmark)}
          {renderActionButton("Upvoted", "reddit-api", "get_user_upvoted", {}, ArrowUp)}
          {renderActionButton("My Multis", "reddit-api", "get_my_multireddits", {}, Layers)}
        </div>
        {renderInputAction("Lookup User", "reddit-api", "get_user_about", [
          { key: "r_lookup_user", placeholder: "Username" },
        ], () => ({ username: getInput("r_lookup_user") }), Search)}
        {renderInputAction("User Posts", "reddit-api", "get_user_posts", [
          { key: "r_upost_user", placeholder: "Username" },
        ], () => ({ username: getInput("r_upost_user"), limit: 25 }), FileText)}
        {renderInputAction("User Comments", "reddit-api", "get_user_comments", [
          { key: "r_ucmt_user", placeholder: "Username" },
        ], () => ({ username: getInput("r_ucmt_user"), limit: 25 }), MessageSquare)}
        {renderInputAction("Wiki Page", "reddit-api", "get_wiki_page", [
          { key: "r_wiki_sub", placeholder: "Subreddit" },
          { key: "r_wiki_page", placeholder: "Page (default: index)" },
        ], () => ({ subreddit: getInput("r_wiki_sub"), page: getInput("r_wiki_page") || "index" }), FileText)}
      </TabsContent>

      <TabsContent value="search" className="space-y-2 mt-3">
        {renderInputAction("Search Posts", "reddit-api", "search", [
          { key: "r_search_q", placeholder: "Search query" },
          { key: "r_search_sub", placeholder: "Subreddit (optional)" },
        ], () => ({ query: getInput("r_search_q"), subreddit: getInput("r_search_sub") || undefined, limit: 25 }), Search)}
        {renderInputAction("Search Subreddits", "reddit-api", "search_subreddits", [
          { key: "r_sub_search", placeholder: "Subreddit name..." },
        ], () => ({ query: getInput("r_sub_search") }), Hash)}
        {renderInputAction("Search Users", "reddit-api", "search_users", [
          { key: "r_user_search", placeholder: "Username..." },
        ], () => ({ query: getInput("r_user_search") }), Users)}
      </TabsContent>

      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Post Generator", "social-ai-responder", "generate_caption", [
          { key: "ai_r_topic", placeholder: "Topic for Reddit post" },
        ], () => ({ topic: getInput("ai_r_topic"), platform: "reddit", include_cta: true }), Brain)}
        {renderInputAction("AI Comment Reply", "social-ai-responder", "generate_dm_reply", [
          { key: "ai_r_comment", placeholder: "Comment to reply to..." },
        ], () => ({ message_text: getInput("ai_r_comment"), sender_name: "redditor" }), Zap)}
      </TabsContent>
    </Tabs>
  );

  const renderTelegramContent = () => (
    <Tabs defaultValue="messages" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[
          { v: "messages", l: "Messages", icon: Send },
          { v: "media", l: "Media", icon: Image },
          { v: "chat", l: "Chat Mgmt", icon: Settings },
          { v: "members", l: "Members", icon: Users },
          { v: "bot", l: "Bot", icon: Bot },
          { v: "forum", l: "Forum", icon: Layers },
          { v: "webhook", l: "Webhooks", icon: Zap },
          { v: "ai", l: "AI Auto", icon: Brain },
        ].map(t => (
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background">
            <t.icon className="h-3 w-3" />{t.l}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="messages" className="space-y-2 mt-3">
        {renderInputAction("Send Text Message", "telegram-api", "send_message", [
          { key: "tg_chat_id", placeholder: "Chat ID" },
          { key: "tg_text", placeholder: "Message text (HTML)" },
        ], () => ({ chat_id: getInput("tg_chat_id"), text: getInput("tg_text") }), Send)}
        {renderInputAction("Forward Message", "telegram-api", "forward_message", [
          { key: "tg_fw_to", placeholder: "To Chat ID" },
          { key: "tg_fw_from", placeholder: "From Chat ID" },
          { key: "tg_fw_msg", placeholder: "Message ID" },
        ], () => ({ chat_id: getInput("tg_fw_to"), from_chat_id: getInput("tg_fw_from"), message_id: parseInt(getInput("tg_fw_msg")) }), Forward)}
        {renderInputAction("Copy Message", "telegram-api", "copy_message", [
          { key: "tg_cp_to", placeholder: "To Chat ID" },
          { key: "tg_cp_from", placeholder: "From Chat ID" },
          { key: "tg_cp_msg", placeholder: "Message ID" },
        ], () => ({ chat_id: getInput("tg_cp_to"), from_chat_id: getInput("tg_cp_from"), message_id: parseInt(getInput("tg_cp_msg")) }), Copy)}
        {renderInputAction("Edit Message", "telegram-api", "edit_message_text", [
          { key: "tg_edit_chat", placeholder: "Chat ID" },
          { key: "tg_edit_msg", placeholder: "Message ID" },
          { key: "tg_edit_text", placeholder: "New text" },
        ], () => ({ chat_id: getInput("tg_edit_chat"), message_id: parseInt(getInput("tg_edit_msg")), text: getInput("tg_edit_text") }), FileText)}
        {renderInputAction("Delete Message", "telegram-api", "delete_message", [
          { key: "tg_del_chat", placeholder: "Chat ID" },
          { key: "tg_del_msg", placeholder: "Message ID" },
        ], () => ({ chat_id: getInput("tg_del_chat"), message_id: parseInt(getInput("tg_del_msg")) }), Trash2)}
        {renderInputAction("Pin Message", "telegram-api", "pin_chat_message", [
          { key: "tg_pin_chat", placeholder: "Chat ID" },
          { key: "tg_pin_msg", placeholder: "Message ID" },
        ], () => ({ chat_id: getInput("tg_pin_chat"), message_id: parseInt(getInput("tg_pin_msg")) }), Pin)}
        {renderInputAction("Send Chat Action", "telegram-api", "send_chat_action", [
          { key: "tg_action_chat", placeholder: "Chat ID" },
          { key: "tg_action_type", placeholder: "typing / upload_photo / etc" },
        ], () => ({ chat_id: getInput("tg_action_chat"), action: getInput("tg_action_type") || "typing" }), Activity)}
        {renderInputAction("Send Poll", "telegram-api", "send_poll", [
          { key: "tg_poll_chat", placeholder: "Chat ID" },
          { key: "tg_poll_q", placeholder: "Question" },
          { key: "tg_poll_opts", placeholder: "Options (comma separated)" },
        ], () => ({ chat_id: getInput("tg_poll_chat"), question: getInput("tg_poll_q"), options: getInput("tg_poll_opts").split(",").map(s => s.trim()).filter(Boolean) }), BarChart3)}
        {renderInputAction("Send Dice", "telegram-api", "send_dice", [
          { key: "tg_dice_chat", placeholder: "Chat ID" },
          { key: "tg_dice_emoji", placeholder: "🎲 🎯 🏀 ⚽ 🎰 🎳" },
        ], () => ({ chat_id: getInput("tg_dice_chat"), emoji: getInput("tg_dice_emoji") || "🎲" }), Dice1)}
      </TabsContent>

      <TabsContent value="media" className="space-y-2 mt-3">
        {renderInputAction("Send Photo", "telegram-api", "send_photo", [
          { key: "tg_ph_chat", placeholder: "Chat ID" },
          { key: "tg_ph_url", placeholder: "Photo URL" },
          { key: "tg_ph_cap", placeholder: "Caption" },
        ], () => ({ chat_id: getInput("tg_ph_chat"), photo_url: getInput("tg_ph_url"), caption: getInput("tg_ph_cap") }), Image)}
        {renderInputAction("Send Video", "telegram-api", "send_video", [
          { key: "tg_vid_chat", placeholder: "Chat ID" },
          { key: "tg_vid_url", placeholder: "Video URL" },
          { key: "tg_vid_cap", placeholder: "Caption" },
        ], () => ({ chat_id: getInput("tg_vid_chat"), video_url: getInput("tg_vid_url"), caption: getInput("tg_vid_cap") }), Video)}
        {renderInputAction("Send Audio", "telegram-api", "send_audio", [
          { key: "tg_aud_chat", placeholder: "Chat ID" },
          { key: "tg_aud_url", placeholder: "Audio URL" },
          { key: "tg_aud_cap", placeholder: "Caption" },
        ], () => ({ chat_id: getInput("tg_aud_chat"), audio_url: getInput("tg_aud_url"), caption: getInput("tg_aud_cap") }), Volume2)}
        {renderInputAction("Send Document", "telegram-api", "send_document", [
          { key: "tg_doc_chat", placeholder: "Chat ID" },
          { key: "tg_doc_url", placeholder: "Document URL" },
          { key: "tg_doc_cap", placeholder: "Caption" },
        ], () => ({ chat_id: getInput("tg_doc_chat"), document_url: getInput("tg_doc_url"), caption: getInput("tg_doc_cap") }), FileText)}
        {renderInputAction("Send Voice", "telegram-api", "send_voice", [
          { key: "tg_voi_chat", placeholder: "Chat ID" },
          { key: "tg_voi_url", placeholder: "Voice URL (.ogg)" },
        ], () => ({ chat_id: getInput("tg_voi_chat"), voice_url: getInput("tg_voi_url") }), Volume2)}
        {renderInputAction("Send Animation (GIF)", "telegram-api", "send_animation", [
          { key: "tg_gif_chat", placeholder: "Chat ID" },
          { key: "tg_gif_url", placeholder: "GIF URL" },
        ], () => ({ chat_id: getInput("tg_gif_chat"), animation_url: getInput("tg_gif_url") }), Play)}
        {renderInputAction("Send Sticker", "telegram-api", "send_sticker", [
          { key: "tg_stick_chat", placeholder: "Chat ID" },
          { key: "tg_stick_id", placeholder: "Sticker file_id or URL" },
        ], () => ({ chat_id: getInput("tg_stick_chat"), sticker: getInput("tg_stick_id") }), Star)}
        {renderInputAction("Send Location", "telegram-api", "send_location", [
          { key: "tg_loc_chat", placeholder: "Chat ID" },
          { key: "tg_loc_lat", placeholder: "Latitude" },
          { key: "tg_loc_lng", placeholder: "Longitude" },
        ], () => ({ chat_id: getInput("tg_loc_chat"), latitude: parseFloat(getInput("tg_loc_lat")), longitude: parseFloat(getInput("tg_loc_lng")) }), MapPin)}
        {renderInputAction("Send Contact", "telegram-api", "send_contact", [
          { key: "tg_cnt_chat", placeholder: "Chat ID" },
          { key: "tg_cnt_phone", placeholder: "Phone" },
          { key: "tg_cnt_name", placeholder: "First name" },
        ], () => ({ chat_id: getInput("tg_cnt_chat"), phone_number: getInput("tg_cnt_phone"), first_name: getInput("tg_cnt_name") }), Phone)}
      </TabsContent>

      <TabsContent value="chat" className="space-y-2 mt-3">
        {renderActionButton("Bot Info", "telegram-api", "get_me", {}, Bot)}
        {renderActionButton("Get Updates", "telegram-api", "get_updates", { limit: 20 }, RefreshCw)}
        {renderInputAction("Get Chat", "telegram-api", "get_chat", [
          { key: "tg_gc_id", placeholder: "Chat ID" },
        ], () => ({ chat_id: getInput("tg_gc_id") }), MessageSquare)}
        {renderInputAction("Member Count", "telegram-api", "get_chat_member_count", [
          { key: "tg_mc_id", placeholder: "Chat ID" },
        ], () => ({ chat_id: getInput("tg_mc_id") }), Users)}
        {renderInputAction("Admins", "telegram-api", "get_chat_administrators", [
          { key: "tg_adm_id", placeholder: "Chat ID" },
        ], () => ({ chat_id: getInput("tg_adm_id") }), Shield)}
        {renderInputAction("Set Title", "telegram-api", "set_chat_title", [
          { key: "tg_st_chat", placeholder: "Chat ID" },
          { key: "tg_st_title", placeholder: "New title" },
        ], () => ({ chat_id: getInput("tg_st_chat"), title: getInput("tg_st_title") }), FileText)}
        {renderInputAction("Set Description", "telegram-api", "set_chat_description", [
          { key: "tg_sd_chat", placeholder: "Chat ID" },
          { key: "tg_sd_desc", placeholder: "New description" },
        ], () => ({ chat_id: getInput("tg_sd_chat"), description: getInput("tg_sd_desc") }), FileText)}
        {renderInputAction("Create Invite Link", "telegram-api", "create_chat_invite_link", [
          { key: "tg_inv_chat", placeholder: "Chat ID" },
          { key: "tg_inv_name", placeholder: "Link name (optional)" },
        ], () => ({ chat_id: getInput("tg_inv_chat"), name: getInput("tg_inv_name") || undefined }), Link2)}
        {renderInputAction("Export Invite Link", "telegram-api", "export_chat_invite_link", [
          { key: "tg_exp_chat", placeholder: "Chat ID" },
        ], () => ({ chat_id: getInput("tg_exp_chat") }), Link2)}
        {renderInputAction("Set Permissions", "telegram-api", "set_chat_permissions", [
          { key: "tg_perm_chat", placeholder: "Chat ID" },
        ], () => ({ chat_id: getInput("tg_perm_chat"), permissions: { can_send_messages: true, can_send_media_messages: true } }), Shield)}
        {renderInputAction("Leave Chat", "telegram-api", "leave_chat", [
          { key: "tg_leave_chat", placeholder: "Chat ID" },
        ], () => ({ chat_id: getInput("tg_leave_chat") }), UserMinus)}
      </TabsContent>

      <TabsContent value="members" className="space-y-2 mt-3">
        {renderInputAction("Get Member", "telegram-api", "get_chat_member", [
          { key: "tg_gm_chat", placeholder: "Chat ID" },
          { key: "tg_gm_user", placeholder: "User ID" },
        ], () => ({ chat_id: getInput("tg_gm_chat"), user_id: parseInt(getInput("tg_gm_user")) }), Users)}
        {renderInputAction("Ban Member", "telegram-api", "ban_chat_member", [
          { key: "tg_ban_chat", placeholder: "Chat ID" },
          { key: "tg_ban_user", placeholder: "User ID" },
        ], () => ({ chat_id: getInput("tg_ban_chat"), user_id: parseInt(getInput("tg_ban_user")) }), Shield)}
        {renderInputAction("Unban Member", "telegram-api", "unban_chat_member", [
          { key: "tg_unban_chat", placeholder: "Chat ID" },
          { key: "tg_unban_user", placeholder: "User ID" },
        ], () => ({ chat_id: getInput("tg_unban_chat"), user_id: parseInt(getInput("tg_unban_user")) }), UserPlus)}
        {renderInputAction("Restrict Member", "telegram-api", "restrict_chat_member", [
          { key: "tg_rest_chat", placeholder: "Chat ID" },
          { key: "tg_rest_user", placeholder: "User ID" },
        ], () => ({ chat_id: getInput("tg_rest_chat"), user_id: parseInt(getInput("tg_rest_user")), permissions: { can_send_messages: false } }), Lock)}
        {renderInputAction("Promote to Admin", "telegram-api", "promote_chat_member", [
          { key: "tg_promo_chat", placeholder: "Chat ID" },
          { key: "tg_promo_user", placeholder: "User ID" },
        ], () => ({ chat_id: getInput("tg_promo_chat"), user_id: parseInt(getInput("tg_promo_user")), can_manage_chat: true, can_delete_messages: true, can_invite_users: true, can_pin_messages: true }), ArrowUp)}
        {renderInputAction("Set Admin Title", "telegram-api", "set_chat_administrator_custom_title", [
          { key: "tg_at_chat", placeholder: "Chat ID" },
          { key: "tg_at_user", placeholder: "User ID" },
          { key: "tg_at_title", placeholder: "Custom title" },
        ], () => ({ chat_id: getInput("tg_at_chat"), user_id: parseInt(getInput("tg_at_user")), custom_title: getInput("tg_at_title") }), Award)}
        {renderInputAction("Approve Join Request", "telegram-api", "approve_chat_join_request", [
          { key: "tg_aj_chat", placeholder: "Chat ID" },
          { key: "tg_aj_user", placeholder: "User ID" },
        ], () => ({ chat_id: getInput("tg_aj_chat"), user_id: parseInt(getInput("tg_aj_user")) }), UserPlus)}
        {renderInputAction("User Profile Photos", "telegram-api", "get_user_profile_photos", [
          { key: "tg_pp_user", placeholder: "User ID" },
        ], () => ({ user_id: parseInt(getInput("tg_pp_user")) }), Image)}
      </TabsContent>

      <TabsContent value="bot" className="space-y-2 mt-3">
        {renderActionButton("Bot Info", "telegram-api", "get_me", {}, Bot)}
        {renderActionButton("My Commands", "telegram-api", "get_my_commands", {}, Briefcase)}
        {renderActionButton("My Name", "telegram-api", "get_my_name", {}, FileText)}
        {renderActionButton("My Description", "telegram-api", "get_my_description", {}, FileText)}
        {renderInputAction("Set Commands", "telegram-api", "set_my_commands", [
          { key: "tg_cmd_json", placeholder: '[{"command":"start","description":"Start bot"}]' },
        ], () => ({ commands: JSON.parse(getInput("tg_cmd_json") || "[]") }), Settings)}
        {renderInputAction("Delete Commands", "telegram-api", "delete_my_commands", [], () => ({}), Trash2)}
        {renderInputAction("Set Bot Name", "telegram-api", "set_my_name", [
          { key: "tg_bot_name", placeholder: "New bot name" },
        ], () => ({ name: getInput("tg_bot_name") }), FileText)}
        {renderInputAction("Set Description", "telegram-api", "set_my_description", [
          { key: "tg_bot_desc", placeholder: "Bot description" },
        ], () => ({ description: getInput("tg_bot_desc") }), FileText)}
        {renderInputAction("Set Menu Button", "telegram-api", "set_chat_menu_button", [
          { key: "tg_menu_chat", placeholder: "Chat ID (optional)" },
        ], () => ({ chat_id: getInput("tg_menu_chat") || undefined, menu_button: { type: "default" } }), Settings)}
        {renderInputAction("Get Sticker Set", "telegram-api", "get_sticker_set", [
          { key: "tg_sticker_name", placeholder: "Sticker set name" },
        ], () => ({ name: getInput("tg_sticker_name") }), Star)}
        {renderInputAction("Get File", "telegram-api", "get_file", [
          { key: "tg_file_id", placeholder: "File ID" },
        ], () => ({ file_id: getInput("tg_file_id") }), Upload)}
        {renderInputAction("Answer Callback", "telegram-api", "answer_callback_query", [
          { key: "tg_cb_id", placeholder: "Callback Query ID" },
          { key: "tg_cb_text", placeholder: "Response text" },
        ], () => ({ callback_query_id: getInput("tg_cb_id"), text: getInput("tg_cb_text") }), Zap)}
      </TabsContent>

      <TabsContent value="forum" className="space-y-2 mt-3">
        {renderInputAction("Create Forum Topic", "telegram-api", "create_forum_topic", [
          { key: "tg_ft_chat", placeholder: "Chat ID" },
          { key: "tg_ft_name", placeholder: "Topic name" },
        ], () => ({ chat_id: getInput("tg_ft_chat"), name: getInput("tg_ft_name") }), FolderOpen)}
        {renderInputAction("Edit Forum Topic", "telegram-api", "edit_forum_topic", [
          { key: "tg_eft_chat", placeholder: "Chat ID" },
          { key: "tg_eft_thread", placeholder: "Thread ID" },
          { key: "tg_eft_name", placeholder: "New name" },
        ], () => ({ chat_id: getInput("tg_eft_chat"), message_thread_id: parseInt(getInput("tg_eft_thread")), name: getInput("tg_eft_name") }), FileText)}
        {renderInputAction("Close Topic", "telegram-api", "close_forum_topic", [
          { key: "tg_cft_chat", placeholder: "Chat ID" },
          { key: "tg_cft_thread", placeholder: "Thread ID" },
        ], () => ({ chat_id: getInput("tg_cft_chat"), message_thread_id: parseInt(getInput("tg_cft_thread")) }), Lock)}
        {renderInputAction("Reopen Topic", "telegram-api", "reopen_forum_topic", [
          { key: "tg_rft_chat", placeholder: "Chat ID" },
          { key: "tg_rft_thread", placeholder: "Thread ID" },
        ], () => ({ chat_id: getInput("tg_rft_chat"), message_thread_id: parseInt(getInput("tg_rft_thread")) }), Unlock)}
        {renderInputAction("Delete Topic", "telegram-api", "delete_forum_topic", [
          { key: "tg_dft_chat", placeholder: "Chat ID" },
          { key: "tg_dft_thread", placeholder: "Thread ID" },
        ], () => ({ chat_id: getInput("tg_dft_chat"), message_thread_id: parseInt(getInput("tg_dft_thread")) }), Trash2)}
      </TabsContent>

      <TabsContent value="webhook" className="space-y-2 mt-3">
        {renderActionButton("Webhook Info", "telegram-api", "get_webhook_info", {}, Zap)}
        {renderInputAction("Set Webhook", "telegram-api", "set_webhook", [
          { key: "tg_wh_url", placeholder: "Webhook URL" },
        ], () => ({ webhook_url: getInput("tg_wh_url") }), Link2)}
        {renderInputAction("Delete Webhook", "telegram-api", "delete_webhook", [], () => ({ drop_pending_updates: false }), Trash2)}
      </TabsContent>

      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Message Generator", "social-ai-responder", "generate_caption", [
          { key: "ai_tg_topic", placeholder: "Topic for broadcast message" },
        ], () => ({ topic: getInput("ai_tg_topic"), platform: "telegram", include_cta: true }), Brain)}
        {renderInputAction("AI Auto-Reply", "social-ai-responder", "generate_dm_reply", [
          { key: "ai_tg_msg", placeholder: "Incoming message text..." },
        ], () => ({ message_text: getInput("ai_tg_msg"), sender_name: "subscriber" }), Zap)}
      </TabsContent>
    </Tabs>
  );

  const renderTikTokContent = () => (
    <Tabs defaultValue="videos" className="w-full">
      <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex-wrap h-auto">
        {[
          { v: "videos", l: "Videos", icon: Video },
          { v: "publish", l: "Publish", icon: Upload },
          { v: "comments", l: "Comments", icon: MessageSquare },
          { v: "dms", l: "DMs", icon: Send },
          { v: "research", l: "Research", icon: Search },
          { v: "playlists", l: "Playlists", icon: List },
          { v: "ai", l: "AI Auto", icon: Brain },
        ].map(t => (
          <TabsTrigger key={t.v} value={t.v} className="text-[10px] gap-1 px-2 py-1 data-[state=active]:bg-background">
            <t.icon className="h-3 w-3" />{t.l}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="videos" className="space-y-2 mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {renderActionButton("My Videos", "tiktok-api", "get_videos", { limit: 20 }, Video)}
          {renderActionButton("User Info", "tiktok-api", "get_user_info", {}, Users)}
          {renderActionButton("Creator Info", "tiktok-api", "get_creator_info", {}, Star)}
        </div>
        {renderInputAction("Get Video Details", "tiktok-api", "get_video_details", [
          { key: "tt_vid_ids", placeholder: "Video IDs (comma separated)" },
        ], () => ({ video_ids: getInput("tt_vid_ids").split(",").map(s => s.trim()) }), Eye)}
      </TabsContent>

      <TabsContent value="publish" className="space-y-2 mt-3">
        {renderInputAction("Publish Video by URL", "tiktok-api", "publish_video_by_url", [
          { key: "tt_pub_url", placeholder: "Video URL" },
          { key: "tt_pub_title", placeholder: "Title / Caption" },
        ], () => ({ video_url: getInput("tt_pub_url"), title: getInput("tt_pub_title"), privacy_level: "PUBLIC_TO_EVERYONE" }), Upload)}
        {renderInputAction("Publish Photo", "tiktok-api", "publish_photo", [
          { key: "tt_ph_title", placeholder: "Title" },
          { key: "tt_ph_urls", placeholder: "Image URLs (comma separated)" },
        ], () => ({ title: getInput("tt_ph_title"), image_urls: getInput("tt_ph_urls").split(",").map(s => s.trim()), privacy_level: "PUBLIC_TO_EVERYONE" }), Image)}
        {renderInputAction("Publish Carousel", "tiktok-api", "publish_carousel", [
          { key: "tt_car_title", placeholder: "Title" },
          { key: "tt_car_urls", placeholder: "Image URLs (comma separated)" },
        ], () => ({ title: getInput("tt_car_title"), image_urls: getInput("tt_car_urls").split(",").map(s => s.trim()), privacy_level: "PUBLIC_TO_EVERYONE" }), Layers)}
        {renderInputAction("Check Publish Status", "tiktok-api", "check_publish_status", [
          { key: "tt_pub_id", placeholder: "Publish ID" },
        ], () => ({ publish_id: getInput("tt_pub_id") }), Activity)}
        {renderInputAction("Init Video Upload", "tiktok-api", "init_video_upload", [
          { key: "tt_upl_title", placeholder: "Title" },
          { key: "tt_upl_size", placeholder: "Video size (bytes)" },
        ], () => ({ title: getInput("tt_upl_title"), video_size: parseInt(getInput("tt_upl_size")), privacy_level: "SELF_ONLY" }), Upload)}
      </TabsContent>

      <TabsContent value="comments" className="space-y-2 mt-3">
        {renderInputAction("Get Comments", "tiktok-api", "get_comments", [
          { key: "tt_cmt_vid", placeholder: "Video ID" },
        ], () => ({ video_id: getInput("tt_cmt_vid"), limit: 50 }), MessageSquare)}
        {renderInputAction("Get Replies", "tiktok-api", "get_comment_replies", [
          { key: "tt_rep_vid", placeholder: "Video ID" },
          { key: "tt_rep_cmt", placeholder: "Comment ID" },
        ], () => ({ video_id: getInput("tt_rep_vid"), comment_id: getInput("tt_rep_cmt") }), MessageSquare)}
        {renderInputAction("Reply to Comment", "tiktok-api", "reply_to_comment", [
          { key: "tt_rply_vid", placeholder: "Video ID" },
          { key: "tt_rply_cmt", placeholder: "Comment ID" },
          { key: "tt_rply_text", placeholder: "Reply text" },
        ], () => ({ video_id: getInput("tt_rply_vid"), comment_id: getInput("tt_rply_cmt"), message: getInput("tt_rply_text") }), Send)}
      </TabsContent>

      <TabsContent value="dms" className="space-y-2 mt-3">
        {renderActionButton("Conversations", "tiktok-api", "get_conversations", {}, MessageSquare)}
        {renderInputAction("Get Messages", "tiktok-api", "get_messages", [
          { key: "tt_dm_conv", placeholder: "Conversation ID" },
        ], () => ({ conversation_id: getInput("tt_dm_conv"), limit: 20 }), MessageSquare)}
        {renderInputAction("Send DM", "tiktok-api", "send_dm", [
          { key: "tt_dm_conv_send", placeholder: "Conversation ID" },
          { key: "tt_dm_text", placeholder: "Message..." },
        ], () => ({ conversation_id: getInput("tt_dm_conv_send"), message: getInput("tt_dm_text") }), Send)}
      </TabsContent>

      <TabsContent value="research" className="space-y-2 mt-3">
        {renderInputAction("Research User", "tiktok-api", "research_user", [
          { key: "tt_ru_user", placeholder: "Username" },
        ], () => ({ username: getInput("tt_ru_user") }), Users)}
        {renderInputAction("Research Videos (Keywords)", "tiktok-api", "research_videos", [
          { key: "tt_rv_keywords", placeholder: "Keywords (comma separated)" },
        ], () => ({ keywords: getInput("tt_rv_keywords").split(",").map(s => s.trim()), limit: 20 }), Search)}
        {renderInputAction("Research Hashtag", "tiktok-api", "research_hashtag", [
          { key: "tt_rh_tags", placeholder: "Hashtags (comma separated)" },
        ], () => ({ hashtags: getInput("tt_rh_tags").split(",").map(s => s.trim()) }), Hash)}
        {renderInputAction("Research Comments", "tiktok-api", "research_comments", [
          { key: "tt_rc_vid", placeholder: "Video ID" },
        ], () => ({ video_id: getInput("tt_rc_vid"), limit: 100 }), MessageSquare)}
      </TabsContent>

      <TabsContent value="playlists" className="space-y-2 mt-3">
        {renderActionButton("My Playlists", "tiktok-api", "get_playlists", { limit: 20 }, List)}
        {renderInputAction("Create Playlist", "tiktok-api", "create_playlist", [
          { key: "tt_pl_name", placeholder: "Playlist name" },
        ], () => ({ name: getInput("tt_pl_name") }), FolderOpen)}
      </TabsContent>

      <TabsContent value="ai" className="space-y-2 mt-3">
        {renderInputAction("AI Caption Generator", "social-ai-responder", "generate_caption", [
          { key: "ai_tt_topic", placeholder: "Topic for TikTok caption" },
        ], () => ({ topic: getInput("ai_tt_topic"), platform: "tiktok", include_cta: true }), Brain)}
        {renderInputAction("AI Comment Reply", "social-ai-responder", "generate_dm_reply", [
          { key: "ai_tt_comment", placeholder: "Comment text to reply to..." },
        ], () => ({ message_text: getInput("ai_tt_comment"), sender_name: "viewer" }), Zap)}
        {renderInputAction("AI Hashtag Strategy", "social-ai-responder", "generate_caption", [
          { key: "ai_tt_hashtag", placeholder: "Video topic for hashtag strategy" },
        ], () => ({ topic: `Generate optimal hashtag strategy for TikTok video about: ${getInput("ai_tt_hashtag")}`, platform: "tiktok", include_cta: false }), Hash)}
      </TabsContent>
    </Tabs>
  );

  const renderPlatformContent = (platformId: string) => {
    switch (platformId) {
      case "twitter": return renderTwitterContent();
      case "reddit": return renderRedditContent();
      case "telegram": return renderTelegramContent();
      case "tiktok": return renderTikTokContent();
      default: return null;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Social Networks API Hub</h3>
          <Badge variant="outline" className="text-[10px]">4 platforms</Badge>
        </div>
      </div>

      <div className="space-y-2">
        {platforms.map(p => {
          const isExpanded = expandedPlatform === p.id;
          return (
            <Card key={p.id} className={`transition-all ${isExpanded ? p.borderColor : ""}`}>
              <button
                onClick={() => setExpandedPlatform(isExpanded ? null : p.id)}
                className="w-full p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors rounded-t-xl"
              >
                <div className={`h-10 w-10 rounded-lg ${p.bgColor} flex items-center justify-center ${p.color}`}>
                  <p.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-foreground">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">Full API automation · AI tools · All endpoints</p>
                </div>
                <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
              </button>
            </Card>
          );
        })}
      </div>

      {/* Expanded Platform Dialog */}
      <Dialog open={!!expandedPlatform} onOpenChange={(open) => { if (!open) setExpandedPlatform(null); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {expandedPlatform && (() => {
                const p = platforms.find(pl => pl.id === expandedPlatform);
                if (!p) return null;
                return (
                  <>
                    <p.icon className={`h-5 w-5 ${p.color}`} />
                    {p.name} — Full API Control Center
                  </>
                );
              })()}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[calc(85vh-100px)] pr-2">
            {expandedPlatform && renderPlatformContent(expandedPlatform)}
            {/* Result viewer */}
            {result && (
              <Card className="mt-4 border-primary/20">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-foreground">API Response</p>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => { navigator.clipboard.writeText(JSON.stringify(result, null, 2)); toast.success("Copied"); }}>
                        <Copy className="h-3 w-3 mr-1" />Copy
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setResult(null)}>
                        <Trash2 className="h-3 w-3 mr-1" />Clear
                      </Button>
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

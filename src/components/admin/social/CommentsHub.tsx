import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare, Send, Trash2, RefreshCw, Bot, Sparkles, Brain,
  Loader2, Instagram, Music2, Globe, Heart, Clock, CheckCheck,
  Compass, Image, Eye, ArrowRight, Filter, XCircle, Zap,
} from "lucide-react";
import CreditCostBadge from "../CreditCostBadge";

interface CommentsHubProps {
  accountId: string;
  connections: any[];
  callApi: (funcName: string, body: any, overrideAccountId?: string) => Promise<any>;
  apiLoading: boolean;
}

interface CommentItem {
  id: string;
  text: string;
  username: string;
  timestamp?: string;
  like_count?: number;
  replies?: any[];
  media_id?: string;
  platform?: string;
}

interface MediaPost {
  id: string;
  caption?: string;
  media_url?: string;
  media_type?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
  permalink?: string;
  platform: string;
}

interface DiscoverPost {
  id: string;
  caption?: string;
  media_url?: string;
  media_type?: string;
  username?: string;
  like_count?: number;
  comments_count?: number;
  permalink?: string;
  selected: boolean;
}

const CommentsHub = ({ accountId, connections, callApi, apiLoading }: CommentsHubProps) => {
  const [activeTab, setActiveTab] = useState("my-posts");
  
  // Connected accounts detection
  const igConnected = connections.some((c: any) => c.platform === "instagram" && c.is_connected);
  const ttConnected = connections.some((c: any) => c.platform === "tiktok" && c.is_connected);
  const [selectedPlatform, setSelectedPlatform] = useState<string>(igConnected ? "instagram" : ttConnected ? "tiktok" : "instagram");

  // My posts
  const [myPosts, setMyPosts] = useState<MediaPost[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string>("");
  const [postsLoading, setPostsLoading] = useState(false);

  // Comments
  const [commentsList, setCommentsList] = useState<CommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // AI bulk reply
  const [bulkAiReplies, setBulkAiReplies] = useState<any[]>([]);
  const [aiRedirectUrl, setAiRedirectUrl] = useState("");
  const [generatingReplies, setGeneratingReplies] = useState(false);

  // Discover feed
  const [discoverPosts, setDiscoverPosts] = useState<DiscoverPost[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);

  // Mass comment
  const [massCommentMode, setMassCommentMode] = useState<"template" | "ai">("ai");
  const [massCommentTemplate, setMassCommentTemplate] = useState("");
  const [massCommenting, setMassCommenting] = useState(false);
  const [massProgress, setMassProgress] = useState<{ done: number; total: number; failed: number } | null>(null);
  const [massDelay, setMassDelay] = useState(2000);
  const cancelMassRef = useRef(false);

  // AI comment generation
  const [aiGenerating, setAiGenerating] = useState(false);
  const [singleAiComment, setSingleAiComment] = useState("");

  // Delete comment
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load my posts on mount
  useEffect(() => {
    if (accountId && (igConnected || ttConnected)) {
      loadMyPosts();
    }
  }, [accountId, selectedPlatform]);

  const loadMyPosts = async () => {
    setPostsLoading(true);
    try {
      if (selectedPlatform === "instagram" && igConnected) {
        const d = await callApi("instagram-api", { action: "get_media", params: { limit: 50 } });
        if (d?.data) {
          setMyPosts(d.data.map((m: any) => ({
            id: m.id, caption: m.caption, media_url: m.media_url || m.thumbnail_url,
            media_type: m.media_type, timestamp: m.timestamp,
            like_count: m.like_count, comments_count: m.comments_count,
            permalink: m.permalink, platform: "instagram",
          })));
        }
      } else if (selectedPlatform === "tiktok" && ttConnected) {
        const d = await callApi("tiktok-api", { action: "get_videos", params: { limit: 50 } });
        if (d?.data?.videos) {
          setMyPosts(d.data.videos.map((v: any) => ({
            id: v.id, caption: v.title || v.description, media_url: v.cover_image_url,
            media_type: "VIDEO", timestamp: v.create_time ? new Date(v.create_time * 1000).toISOString() : undefined,
            like_count: v.like_count, comments_count: v.comment_count,
            permalink: v.share_url, platform: "tiktok",
          })));
        }
      }
    } catch (e: any) { toast.error(e.message); }
    setPostsLoading(false);
  };

  const loadComments = async (mediaId: string) => {
    setCommentsLoading(true);
    setSelectedPostId(mediaId);
    setBulkAiReplies([]);
    try {
      if (selectedPlatform === "instagram") {
        const d = await callApi("instagram-api", { action: "get_comments", params: { media_id: mediaId, limit: 100 } });
        if (d?.data) {
          setCommentsList(d.data.map((c: any) => ({
            id: c.id, text: c.text, username: c.username || c.from?.username || "user",
            timestamp: c.timestamp, like_count: c.like_count, replies: c.replies?.data,
            media_id: mediaId, platform: "instagram",
          })));
        }
      } else if (selectedPlatform === "tiktok") {
        const d = await callApi("tiktok-api", { action: "get_comments", params: { video_id: mediaId, limit: 100 } });
        if (d?.data?.comments) {
          setCommentsList(d.data.comments.map((c: any) => ({
            id: c.id, text: c.text, username: c.user?.unique_id || "user",
            timestamp: c.create_time ? new Date(c.create_time * 1000).toISOString() : undefined,
            like_count: c.digg_count, media_id: mediaId, platform: "tiktok",
          })));
        }
      }
    } catch (e: any) { toast.error(e.message); }
    setCommentsLoading(false);
  };

  const replyToComment = async (commentId: string, commentText: string, author: string) => {
    if (!replyText.trim()) return;
    const funcName = selectedPlatform === "instagram" ? "instagram-api" : "tiktok-api";
    const params = selectedPlatform === "instagram"
      ? { comment_id: commentId, media_id: selectedPostId, message: replyText, comment_text: commentText, comment_author: author }
      : { video_id: selectedPostId, comment_id: commentId, message: replyText, comment_text: commentText, comment_author: author };
    await callApi(funcName, { action: "reply_to_comment", params });
    setReplyText("");
    setReplyingTo(null);
    toast.success("Reply sent");
  };

  const deleteComment = async (commentId: string) => {
    setDeletingId(commentId);
    try {
      if (selectedPlatform === "instagram") {
        await callApi("instagram-api", { action: "delete_comment", params: { comment_id: commentId, media_id: selectedPostId } });
      } else {
        await callApi("tiktok-api", { action: "delete_comment", params: { comment_id: commentId, video_id: selectedPostId } });
      }
      setCommentsList(prev => prev.filter(c => c.id !== commentId));
      toast.success("Comment deleted");
    } catch { toast.error("Delete failed"); }
    setDeletingId(null);
  };

  const generateAiReplyForComment = async (comment: CommentItem) => {
    setAiGenerating(true);
    try {
      const d = await callApi("social-ai-responder", {
        action: "generate_comment_reply",
        params: { comment_text: comment.text, comment_author: comment.username, redirect_url: aiRedirectUrl },
      });
      if (d?.reply) {
        setReplyText(d.reply);
        setReplyingTo(comment.id);
        toast.success("AI reply generated");
      }
    } catch { toast.error("AI generation failed"); }
    setAiGenerating(false);
  };

  const bulkGenerateReplies = async () => {
    if (commentsList.length === 0) return;
    setGeneratingReplies(true);
    try {
      const d = await callApi("social-ai-responder", {
        action: "bulk_generate_replies",
        params: { comments: commentsList.slice(0, 30), redirect_url: aiRedirectUrl },
      });
      if (d?.replies) {
        setBulkAiReplies(d.replies);
        toast.success(`Generated ${d.replies.length} AI replies`);
      }
    } catch { toast.error("Bulk AI failed"); }
    setGeneratingReplies(false);
  };

  const sendBulkReply = async (reply: any) => {
    const funcName = selectedPlatform === "instagram" ? "instagram-api" : "tiktok-api";
    const params = selectedPlatform === "instagram"
      ? { comment_id: reply.comment_id, media_id: selectedPostId, message: reply.generated_reply, comment_text: reply.comment_text, comment_author: reply.username }
      : { video_id: selectedPostId, comment_id: reply.comment_id, message: reply.generated_reply };
    await callApi(funcName, { action: "reply_to_comment", params });
    setBulkAiReplies(prev => prev.filter(r => r.comment_id !== reply.comment_id));
    toast.success("Sent");
  };

  const sendAllBulkReplies = async () => {
    for (const reply of bulkAiReplies) {
      await sendBulkReply(reply);
      await new Promise(r => setTimeout(r, 1000));
    }
    toast.success("All AI replies sent");
  };

  // ===== DISCOVER FEED =====
  const loadDiscoverFeed = async () => {
    setDiscoverLoading(true);
    try {
      if (selectedPlatform === "instagram") {
        // Use hashtag search or explore-like endpoints
        const d = await callApi("instagram-api", { action: "get_media", params: { limit: 50 } });
        // Also try to get tagged media and explore content
        const taggedData = await callApi("instagram-api", { action: "get_tagged_media", params: { limit: 50 } });
        
        const posts: DiscoverPost[] = [];
        // Add own recent posts for discover
        if (d?.data) {
          for (const m of d.data.slice(0, 10)) {
            posts.push({
              id: m.id, caption: m.caption, media_url: m.media_url || m.thumbnail_url,
              media_type: m.media_type, username: "you",
              like_count: m.like_count, comments_count: m.comments_count,
              permalink: m.permalink, selected: false,
            });
          }
        }
        // Add tagged/mentioned posts
        if (taggedData?.data) {
          for (const m of taggedData.data) {
            if (!posts.some(p => p.id === m.id)) {
              posts.push({
                id: m.id, caption: m.caption, media_url: m.media_url || m.thumbnail_url,
                media_type: m.media_type, username: m.username || "tagged",
                like_count: m.like_count, comments_count: m.comments_count,
                permalink: m.permalink, selected: false,
              });
            }
          }
        }
        setDiscoverPosts(posts);
        if (posts.length > 0) toast.success(`Found ${posts.length} posts`);
        else toast.info("No discover posts found. Try connecting more accounts.");
      } else if (selectedPlatform === "tiktok") {
        const d = await callApi("tiktok-api", { action: "get_videos", params: { limit: 50 } });
        if (d?.data?.videos) {
          setDiscoverPosts(d.data.videos.map((v: any) => ({
            id: v.id, caption: v.title || v.description, media_url: v.cover_image_url,
            media_type: "VIDEO", username: "you",
            like_count: v.like_count, comments_count: v.comment_count,
            permalink: v.share_url, selected: false,
          })));
        }
      }
    } catch (e: any) { toast.error(e.message); }
    setDiscoverLoading(false);
  };

  const toggleDiscoverSelect = (id: string) => {
    setDiscoverPosts(prev => prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p));
  };

  const selectAllDiscover = () => {
    const allSelected = discoverPosts.every(p => p.selected);
    setDiscoverPosts(prev => prev.map(p => ({ ...p, selected: !allSelected })));
  };

  // ===== MASS COMMENT =====
  const startMassComment = async () => {
    const selected = discoverPosts.filter(p => p.selected);
    if (selected.length === 0) { toast.error("Select posts first"); return; }
    if (massCommentMode === "template" && !massCommentTemplate.trim()) { toast.error("Enter a template message"); return; }

    setMassCommenting(true);
    cancelMassRef.current = false;
    setMassProgress({ done: 0, total: selected.length, failed: 0 });
    let done = 0, failed = 0;

    for (const post of selected) {
      if (cancelMassRef.current) break;
      try {
        let commentText = massCommentTemplate;

        if (massCommentMode === "ai") {
          // AI scans the post and generates contextual comment
          const aiResult = await callApi("social-ai-responder", {
            action: "generate_contextual_comment",
            params: {
              post_caption: post.caption || "",
              post_author: post.username || "creator",
              media_type: post.media_type || "IMAGE",
              redirect_url: aiRedirectUrl,
            },
          });
          if (aiResult?.comment) {
            commentText = aiResult.comment;
          } else {
            failed++;
            setMassProgress({ done, total: selected.length, failed });
            continue;
          }
        }

        // Post comment
        if (selectedPlatform === "instagram") {
          await callApi("instagram-api", {
            action: "post_comment",
            params: { media_id: post.id, message: commentText },
          });
        } else {
          await callApi("tiktok-api", {
            action: "post_comment",
            params: { video_id: post.id, message: commentText },
          });
        }
        done++;
      } catch { failed++; }
      setMassProgress({ done, total: selected.length, failed });
      if (!cancelMassRef.current) await new Promise(r => setTimeout(r, massDelay));
    }
    setMassCommenting(false);
    toast.success(`Done: ${done} commented, ${failed} failed`);
  };

  // Generate single AI comment preview
  const previewAiComment = async (caption: string, author: string) => {
    setAiGenerating(true);
    try {
      const d = await callApi("social-ai-responder", {
        action: "generate_contextual_comment",
        params: { post_caption: caption || "", post_author: author || "creator", redirect_url: aiRedirectUrl },
      });
      if (d?.comment) { setSingleAiComment(d.comment); toast.success("AI comment preview generated"); }
    } catch { toast.error("AI failed"); }
    setAiGenerating(false);
  };

  const connectedPlatforms = connections.filter((c: any) => c.is_connected && ["instagram", "tiktok"].includes(c.platform));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-emerald-400" /> Comment Manager
          </h3>
          <CreditCostBadge cost="2–5" variant="header" label="/action" />
        </div>

        {/* Platform selector - auto-detected */}
        <div className="flex items-center gap-1.5">
          {connectedPlatforms.length === 0 && (
            <span className="text-[10px] text-amber-400">No accounts connected</span>
          )}
          {connectedPlatforms.map((c: any) => {
            const isIG = c.platform === "instagram";
            const Icon = isIG ? Instagram : Music2;
            return (
              <button key={c.id}
                onClick={() => setSelectedPlatform(c.platform)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${selectedPlatform === c.platform ? "bg-foreground/10 text-foreground ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
                <Icon className={`h-3 w-3 ${isIG ? "text-pink-400" : "text-cyan-400"}`} />
                @{c.platform_username}
              </button>
            );
          })}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5 flex flex-wrap w-full">
          <TabsTrigger value="my-posts" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground rounded-md gap-1 text-xs px-2 py-1.5">
            <Image className="h-3.5 w-3.5" /> My Posts
          </TabsTrigger>
          <TabsTrigger value="discover" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground rounded-md gap-1 text-xs px-2 py-1.5">
            <Compass className="h-3.5 w-3.5" /> Discover & Mass Comment
          </TabsTrigger>
        </TabsList>

        {/* ===== MY POSTS & COMMENTS ===== */}
        <TabsContent value="my-posts" className="space-y-3 mt-3">
          <div className="flex gap-2 items-center">
            <Button size="sm" variant="outline" onClick={loadMyPosts} disabled={postsLoading} className="text-foreground">
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${postsLoading ? "animate-spin" : ""}`} /> Load Posts
            </Button>
            {selectedPostId && (
              <Badge className="bg-emerald-500/15 text-emerald-400">{commentsList.length} comments</Badge>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Posts list */}
            <Card>
              <CardContent className="p-3">
                <p className="text-xs font-semibold text-foreground mb-2">Select a post ({myPosts.length})</p>
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-1.5">
                    {postsLoading && <div className="flex items-center gap-2 py-8 justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">Loading posts...</span></div>}
                    {!postsLoading && myPosts.length === 0 && (
                      <div className="text-center py-8">
                        <Image className="h-6 w-6 text-muted-foreground/30 mx-auto mb-1" />
                        <p className="text-[11px] text-muted-foreground">No posts found. Connect an account first.</p>
                      </div>
                    )}
                    {myPosts.map(post => (
                      <button key={post.id}
                        onClick={() => loadComments(post.id)}
                        className={`w-full text-left p-2.5 rounded-lg border transition-colors ${selectedPostId === post.id ? "bg-emerald-500/10 border-emerald-500/30" : "bg-muted/20 border-border hover:bg-muted/40"}`}>
                        <div className="flex gap-2">
                          {post.media_url && (
                            <img src={post.media_url} alt="" className="h-12 w-12 rounded object-cover flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-foreground line-clamp-2">{post.caption || "No caption"}</p>
                            <div className="flex items-center gap-3 mt-1">
                              {post.like_count != null && <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><Heart className="h-2.5 w-2.5" /> {post.like_count}</span>}
                              {post.comments_count != null && <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><MessageSquare className="h-2.5 w-2.5" /> {post.comments_count}</span>}
                              {post.timestamp && <span className="text-[9px] text-muted-foreground">{new Date(post.timestamp).toLocaleDateString()}</span>}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Comments panel */}
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-foreground">Comments</p>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={bulkGenerateReplies}
                      disabled={generatingReplies || commentsList.length === 0}>
                      {generatingReplies ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      AI Reply All
                    </Button>
                    {bulkAiReplies.length > 0 && (
                      <Button size="sm" className="h-6 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={sendAllBulkReplies}>
                        <Send className="h-3 w-3" /> Send All ({bulkAiReplies.length})
                      </Button>
                    )}
                  </div>
                </div>

                {/* AI redirect URL */}
                <Input value={aiRedirectUrl} onChange={e => setAiRedirectUrl(e.target.value)}
                  placeholder="Redirect link for AI replies (optional)" className="text-xs h-7 mb-2" />

                <ScrollArea className="max-h-[420px]">
                  {commentsLoading && <div className="flex items-center gap-2 py-8 justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">Loading comments...</span></div>}
                  
                  {!commentsLoading && commentsList.length === 0 && !selectedPostId && (
                    <div className="text-center py-8">
                      <MessageSquare className="h-6 w-6 text-muted-foreground/30 mx-auto mb-1" />
                      <p className="text-[11px] text-muted-foreground">Select a post to view comments</p>
                    </div>
                  )}

                  {!commentsLoading && commentsList.length === 0 && selectedPostId && (
                    <div className="text-center py-8">
                      <MessageSquare className="h-6 w-6 text-muted-foreground/30 mx-auto mb-1" />
                      <p className="text-[11px] text-muted-foreground">No comments on this post</p>
                    </div>
                  )}

                  {/* Bulk AI replies view */}
                  {bulkAiReplies.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      <p className="text-[10px] font-medium text-emerald-400 mb-1">{bulkAiReplies.length} AI replies ready to send</p>
                      {bulkAiReplies.map((r, i) => (
                        <div key={i} className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2.5">
                          <p className="text-[10px] text-muted-foreground">@{r.username}: "{r.comment_text}"</p>
                          <p className="text-[11px] text-foreground mt-0.5 font-medium">{r.generated_reply}</p>
                          <div className="flex gap-1 mt-1.5">
                            <Button size="sm" variant="outline" className="h-5 text-[9px] gap-0.5" onClick={() => sendBulkReply(r)}>
                              <Send className="h-2.5 w-2.5" /> Send
                            </Button>
                            <Button size="sm" variant="ghost" className="h-5 text-[9px] text-destructive" onClick={() => setBulkAiReplies(p => p.filter(x => x.comment_id !== r.comment_id))}>
                              Skip
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Individual comments */}
                  {!bulkAiReplies.length && commentsList.map(comment => (
                    <div key={comment.id} className="bg-muted/20 rounded-lg p-2.5 mb-1.5 border border-border/30">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-foreground">@{comment.username}</span>
                          {comment.timestamp && <span className="text-[9px] text-muted-foreground">{new Date(comment.timestamp).toLocaleDateString()}</span>}
                          {comment.like_count != null && <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><Heart className="h-2 w-2" /> {comment.like_count}</span>}
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => generateAiReplyForComment(comment)} disabled={aiGenerating}
                            className="p-1 rounded hover:bg-purple-500/20 transition-colors" title="AI Reply">
                            {aiGenerating && replyingTo === comment.id ? <Loader2 className="h-3 w-3 animate-spin text-purple-400" /> : <Brain className="h-3 w-3 text-purple-400" />}
                          </button>
                          <button onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyText(""); }}
                            className="p-1 rounded hover:bg-blue-500/20 transition-colors" title="Reply">
                            <ArrowRight className="h-3 w-3 text-blue-400" />
                          </button>
                          <button onClick={() => deleteComment(comment.id)} disabled={deletingId === comment.id}
                            className="p-1 rounded hover:bg-destructive/20 transition-colors" title="Delete">
                            {deletingId === comment.id ? <Loader2 className="h-3 w-3 animate-spin text-destructive" /> : <Trash2 className="h-3 w-3 text-destructive/60" />}
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-foreground">{comment.text}</p>

                      {/* Reply input */}
                      {replyingTo === comment.id && (
                        <div className="flex gap-1 mt-2">
                          <Input value={replyText} onChange={e => setReplyText(e.target.value)}
                            placeholder="Write reply..." className="text-[11px] h-7 flex-1" autoFocus
                            onKeyDown={e => e.key === "Enter" && replyToComment(comment.id, comment.text, comment.username)} />
                          <Button size="sm" variant="outline" className="h-7 px-2"
                            onClick={() => replyToComment(comment.id, comment.text, comment.username)} disabled={!replyText.trim()}>
                            <Send className="h-3 w-3" />
                          </Button>
                        </div>
                      )}

                      {/* Sub-replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-1.5 pl-3 border-l border-border/30 space-y-1">
                          {comment.replies.map((r: any) => (
                            <div key={r.id} className="text-[10px]">
                              <span className="font-semibold text-foreground">@{r.username}</span>
                              <span className="text-foreground ml-1">{r.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== DISCOVER & MASS COMMENT ===== */}
        <TabsContent value="discover" className="space-y-3 mt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={loadDiscoverFeed} disabled={discoverLoading} className="text-foreground">
              <Compass className={`h-3.5 w-3.5 mr-1 ${discoverLoading ? "animate-spin" : ""}`} /> Discover Posts
            </Button>
            <Button size="sm" variant="outline" onClick={selectAllDiscover} disabled={discoverPosts.length === 0} className="text-foreground">
              <CheckCheck className="h-3.5 w-3.5 mr-1" /> {discoverPosts.every(p => p.selected) ? "Deselect All" : "Select All"}
            </Button>
            <Badge variant="outline" className="text-[10px]">{discoverPosts.filter(p => p.selected).length}/{discoverPosts.length} selected</Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Discover posts grid */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-3">
                  <ScrollArea className="max-h-[500px]">
                    {discoverLoading && <div className="flex items-center gap-2 py-8 justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">Loading discover feed...</span></div>}
                    {!discoverLoading && discoverPosts.length === 0 && (
                      <div className="text-center py-12">
                        <Compass className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">Click "Discover Posts" to load posts from your feed</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {discoverPosts.map(post => (
                        <div key={post.id}
                          onClick={() => toggleDiscoverSelect(post.id)}
                          className={`rounded-lg border p-2.5 cursor-pointer transition-colors ${post.selected ? "bg-emerald-500/10 border-emerald-500/30" : "bg-muted/10 border-border hover:bg-muted/30"}`}>
                          <div className="flex gap-2">
                            {post.media_url && <img src={post.media_url} alt="" className="h-14 w-14 rounded object-cover flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-0.5">
                                <div className={`h-3.5 w-3.5 rounded border flex-shrink-0 flex items-center justify-center ${post.selected ? "bg-emerald-500 border-emerald-500" : "border-border"}`}>
                                  {post.selected && <CheckCheck className="h-2 w-2 text-white" />}
                                </div>
                                <span className="text-[10px] font-medium text-foreground">@{post.username}</span>
                              </div>
                              <p className="text-[10px] text-foreground line-clamp-2">{post.caption || "No caption"}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {post.like_count != null && <span className="text-[8px] text-muted-foreground"><Heart className="h-2 w-2 inline" /> {post.like_count}</span>}
                                {post.comments_count != null && <span className="text-[8px] text-muted-foreground"><MessageSquare className="h-2 w-2 inline" /> {post.comments_count}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Mass comment panel */}
            <div>
              <Card>
                <CardContent className="p-3 space-y-3">
                  <p className="text-xs font-semibold text-foreground">Mass Comment</p>

                  {/* Mode toggle */}
                  <div className="flex gap-1">
                    <button onClick={() => setMassCommentMode("ai")}
                      className={`flex-1 px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-colors ${massCommentMode === "ai" ? "bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30" : "text-muted-foreground hover:text-foreground bg-muted/30"}`}>
                      <Brain className="h-3 w-3 inline mr-1" /> AI Auto-Scan
                    </button>
                    <button onClick={() => setMassCommentMode("template")}
                      className={`flex-1 px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-colors ${massCommentMode === "template" ? "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30" : "text-muted-foreground hover:text-foreground bg-muted/30"}`}>
                      <MessageSquare className="h-3 w-3 inline mr-1" /> Template
                    </button>
                  </div>

                  {massCommentMode === "ai" ? (
                    <div className="space-y-2">
                      <p className="text-[10px] text-muted-foreground">AI will scan each post caption and generate a unique, contextual comment.</p>
                      <Input value={aiRedirectUrl} onChange={e => setAiRedirectUrl(e.target.value)}
                        placeholder="Redirect URL (optional)" className="text-xs h-7" />
                      
                      {/* Preview AI comment */}
                      {discoverPosts.filter(p => p.selected).length > 0 && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 w-full" disabled={aiGenerating}
                          onClick={() => {
                            const first = discoverPosts.find(p => p.selected);
                            if (first) previewAiComment(first.caption || "", first.username || "creator");
                          }}>
                          {aiGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                          Preview AI Comment
                        </Button>
                      )}
                      {singleAiComment && (
                        <div className="bg-purple-500/5 border border-purple-500/20 rounded p-2">
                          <p className="text-[10px] text-foreground">{singleAiComment}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Textarea value={massCommentTemplate} onChange={e => setMassCommentTemplate(e.target.value)}
                      placeholder="Your comment template... (same comment on every post)"
                      className="text-xs min-h-[60px] resize-none" />
                  )}

                  {/* Delay */}
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Delay:</span>
                    <div className="flex gap-1">
                      {[1000, 2000, 3000, 5000].map(ms => (
                        <button key={ms} onClick={() => setMassDelay(ms)}
                          className={`text-[9px] px-1.5 py-0.5 rounded ${massDelay === ms ? "bg-emerald-500/20 text-emerald-400" : "text-muted-foreground hover:text-foreground bg-muted/30"}`}>
                          {ms / 1000}s
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Execute */}
                  <Button size="sm" onClick={startMassComment}
                    disabled={massCommenting || discoverPosts.filter(p => p.selected).length === 0}
                    className="w-full h-8 text-[11px] gap-1.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0">
                    {massCommenting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Comment on {discoverPosts.filter(p => p.selected).length} posts
                  </Button>

                  {massCommenting && (
                    <Button size="sm" variant="outline" onClick={() => { cancelMassRef.current = true; }}
                      className="w-full h-7 text-[10px] text-destructive border-destructive/30">
                      Cancel
                    </Button>
                  )}

                  {/* Progress */}
                  {massProgress && (
                    <div>
                      <div className="flex items-center gap-2 text-[10px] mb-1">
                        {massCommenting ? <Loader2 className="h-3 w-3 animate-spin text-blue-400" /> : <CheckCheck className="h-3 w-3 text-emerald-400" />}
                        <span className={massCommenting ? "text-blue-400" : "text-emerald-400"}>
                          {massCommenting ? `Commenting ${massProgress.done}/${massProgress.total}` : `Done: ${massProgress.done} commented`}
                        </span>
                        {massProgress.failed > 0 && <span className="text-destructive">({massProgress.failed} failed)</span>}
                      </div>
                      <Progress value={massProgress.total > 0 ? (massProgress.done / massProgress.total) * 100 : 0} className="h-1.5" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CommentsHub;

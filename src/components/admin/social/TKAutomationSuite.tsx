import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Music2, ChevronDown, ChevronUp, Zap, Video, Upload, Eye,
  MessageSquare, Search, Hash, ListVideo, Send, RefreshCw,
  TrendingUp, BarChart3, Users, Shield, Play, Image, Layers,
  Clock, Heart, Share2, ExternalLink, Trash2, Loader2,
  Brain, FolderOpen, Activity, Target, Globe, Star,
} from "lucide-react";

interface Props {
  selectedAccount: string;
}

const TikTokIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.76 1.52V6.84a4.84 4.84 0 0 1-1-.15z"/>
  </svg>
);

const SECTIONS = [
  // Dashboard & Profile
  { id: "dashboard", icon: Activity, label: "Dashboard & Profile", desc: "TikTok profile overview, stats & account sync", color: "text-cyan-400", category: "Core" },
  // Content Management
  { id: "videos", icon: Video, label: "Video Manager", desc: "Browse, search & manage all your TikTok videos", color: "text-teal-400", category: "Content" },
  { id: "publish-video", icon: Upload, label: "Publish Video", desc: "Upload video by URL, file upload, or direct post", color: "text-green-400", category: "Content" },
  { id: "publish-photo", icon: Image, label: "Publish Photo / Carousel", desc: "Post photos and carousel content to TikTok", color: "text-blue-400", category: "Content" },
  { id: "playlists", icon: ListVideo, label: "Playlist Manager", desc: "Create and manage TikTok video playlists", color: "text-violet-400", category: "Content" },
  // Engagement
  { id: "comments", icon: MessageSquare, label: "Comments Manager", desc: "View, reply & manage comments on your videos", color: "text-amber-400", category: "Engagement" },
  { id: "dms", icon: Send, label: "Direct Messages", desc: "View conversations, read & send TikTok DMs", color: "text-pink-400", category: "Engagement" },
  // Research & Discovery
  { id: "research-users", icon: Users, label: "User Research", desc: "Look up any TikTok creator's public profile & stats", color: "text-purple-400", category: "Research" },
  { id: "research-videos", icon: Search, label: "Video Research", desc: "Search trending videos by keywords, dates & filters", color: "text-lime-400", category: "Research" },
  { id: "research-hashtags", icon: Hash, label: "Hashtag Research", desc: "Analyze hashtag performance, volume & trends", color: "text-rose-400", category: "Research" },
  { id: "research-comments", icon: Eye, label: "Comment Research", desc: "Analyze comments on any public TikTok video", color: "text-orange-400", category: "Research" },
  // Account
  { id: "creator-info", icon: Star, label: "Creator Info & Posting Rules", desc: "View posting capabilities, limits & duet/stitch settings", color: "text-yellow-400", category: "Account" },
  { id: "token-mgmt", icon: Shield, label: "Token & Connection Health", desc: "Refresh tokens, check connection status & revoke access", color: "text-red-400", category: "Account" },
];

const CATEGORIES = ["Core", "Content", "Engagement", "Research", "Account"];

const TKAutomationSuite = ({ selectedAccount }: Props) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["dashboard"]));
  const [loading, setLoading] = useState(false);

  // Dashboard state
  const [profile, setProfile] = useState<any>(null);

  // Videos state
  const [videos, setVideos] = useState<any[]>([]);
  const [videosCursor, setVideosCursor] = useState<string | null>(null);
  const [videosHasMore, setVideosHasMore] = useState(false);

  // Publish video state
  const [publishVideoUrl, setPublishVideoUrl] = useState("");
  const [publishVideoTitle, setPublishVideoTitle] = useState("");
  const [publishPrivacy, setPublishPrivacy] = useState("PUBLIC_TO_EVERYONE");
  const [disableDuet, setDisableDuet] = useState(false);
  const [disableComment, setDisableComment] = useState(false);
  const [disableStitch, setDisableStitch] = useState(false);

  // Publish photo state
  const [photoUrls, setPhotoUrls] = useState("");
  const [photoTitle, setPhotoTitle] = useState("");
  const [photoDesc, setPhotoDesc] = useState("");
  const [photoPrivacy, setPhotoPrivacy] = useState("PUBLIC_TO_EVERYONE");
  const [mediaType, setMediaType] = useState<"PHOTO" | "CAROUSEL">("PHOTO");

  // Playlists state
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  // Comments state
  const [commentsVideoId, setCommentsVideoId] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // DMs state
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [dmText, setDmText] = useState("");

  // Research state
  const [researchUsername, setResearchUsername] = useState("");
  const [researchUserResult, setResearchUserResult] = useState<any>(null);
  const [researchKeywords, setResearchKeywords] = useState("");
  const [researchVideoResults, setResearchVideoResults] = useState<any[]>([]);
  const [researchHashtags, setResearchHashtags] = useState("");
  const [researchHashtagResults, setResearchHashtagResults] = useState<any[]>([]);
  const [researchCommentVideoId, setResearchCommentVideoId] = useState("");
  const [researchComments, setResearchComments] = useState<any[]>([]);

  // Creator info
  const [creatorInfo, setCreatorInfo] = useState<any>(null);

  // Publish status
  const [publishId, setPublishId] = useState("");
  const [publishStatus, setPublishStatus] = useState<any>(null);

  const callApi = useCallback(async (action: string, params?: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("tiktok-api", {
        body: { action, account_id: selectedAccount, params },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "API call failed");
      return data.data;
    } catch (e: any) {
      toast.error(e.message || "TikTok API error");
      return null;
    } finally {
      setLoading(false);
    }
  }, [selectedAccount]);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedSections(new Set(SECTIONS.map(s => s.id)));
  const collapseAll = () => setExpandedSections(new Set());

  // === API HANDLERS ===
  const fetchProfile = async () => {
    const d = await callApi("get_user_info");
    if (d?.data?.user) { setProfile(d.data.user); toast.success("TikTok profile synced"); }
    else if (d?.user) { setProfile(d.user); toast.success("TikTok profile synced"); }
  };

  const fetchVideos = async (cursor?: string) => {
    const d = await callApi("get_videos", { limit: 20, cursor });
    if (d?.data) {
      const vids = d.data.videos || [];
      setVideos(prev => cursor ? [...prev, ...vids] : vids);
      setVideosCursor(d.data.cursor || null);
      setVideosHasMore(d.data.has_more || false);
    }
  };

  const publishVideoByUrl = async () => {
    if (!publishVideoUrl) { toast.error("Enter a video URL"); return; }
    const d = await callApi("publish_video_by_url", {
      video_url: publishVideoUrl, title: publishVideoTitle, privacy_level: publishPrivacy,
      disable_duet: disableDuet, disable_comment: disableComment, disable_stitch: disableStitch,
    });
    if (d?.data?.publish_id) {
      setPublishId(d.data.publish_id);
      toast.success(`Video publishing initiated! ID: ${d.data.publish_id}`);
      setPublishVideoUrl(""); setPublishVideoTitle("");
    }
  };

  const checkPublishStatus = async () => {
    if (!publishId) { toast.error("Enter a publish ID"); return; }
    const d = await callApi("check_publish_status", { publish_id: publishId });
    if (d) { setPublishStatus(d); toast.success("Status fetched"); }
  };

  const publishPhoto = async () => {
    const urls = photoUrls.split("\n").map(u => u.trim()).filter(Boolean);
    if (urls.length === 0) { toast.error("Enter at least one image URL"); return; }
    const action = mediaType === "CAROUSEL" ? "publish_carousel" : "publish_photo";
    const d = await callApi(action, {
      image_urls: urls, title: photoTitle, description: photoDesc,
      privacy_level: photoPrivacy, disable_comment: disableComment,
    });
    if (d) { toast.success(`${mediaType === "CAROUSEL" ? "Carousel" : "Photo"} published!`); setPhotoUrls(""); setPhotoTitle(""); setPhotoDesc(""); }
  };

  const fetchPlaylists = async () => {
    const d = await callApi("get_playlists", { limit: 20 });
    if (d?.data?.playlists) setPlaylists(d.data.playlists);
  };

  const createPlaylist = async () => {
    if (!newPlaylistName) { toast.error("Enter playlist name"); return; }
    const d = await callApi("create_playlist", { name: newPlaylistName });
    if (d) { toast.success("Playlist created"); setNewPlaylistName(""); fetchPlaylists(); }
  };

  const fetchComments = async () => {
    if (!commentsVideoId) { toast.error("Enter a video ID"); return; }
    const d = await callApi("get_comments", { video_id: commentsVideoId, limit: 50 });
    if (d?.data?.comments) setComments(d.data.comments);
  };

  const replyToComment = async (commentId: string) => {
    if (!replyText) return;
    await callApi("reply_to_comment", { video_id: commentsVideoId, comment_id: commentId, message: replyText });
    toast.success("Reply sent");
    setReplyText(""); setReplyingTo(null);
    fetchComments();
  };

  const fetchConversations = async () => {
    const d = await callApi("get_conversations");
    if (d?.data?.conversations) setConversations(d.data.conversations);
  };

  const fetchMessages = async (convoId: string) => {
    setSelectedConvo(convoId);
    const d = await callApi("get_messages", { conversation_id: convoId, limit: 20 });
    if (d?.data?.messages) setMessages(d.data.messages);
  };

  const sendDm = async () => {
    if (!selectedConvo || !dmText) return;
    await callApi("send_dm", { conversation_id: selectedConvo, message: dmText });
    toast.success("DM sent"); setDmText("");
    fetchMessages(selectedConvo);
  };

  const researchUser = async () => {
    if (!researchUsername) return;
    const d = await callApi("research_user", { username: researchUsername });
    if (d?.data) setResearchUserResult(d.data);
  };

  const researchVideoSearch = async () => {
    if (!researchKeywords) return;
    const keywords = researchKeywords.split(",").map(k => k.trim()).filter(Boolean);
    const d = await callApi("research_videos", { keywords, limit: 20 });
    if (d?.data?.videos) setResearchVideoResults(d.data.videos);
  };

  const researchHashtagSearch = async () => {
    if (!researchHashtags) return;
    const hashtags = researchHashtags.split(",").map(h => h.trim()).filter(Boolean);
    const d = await callApi("research_hashtag", { hashtags });
    if (d?.data?.hashtags) setResearchHashtagResults(d.data.hashtags);
  };

  const researchCommentsFetch = async () => {
    if (!researchCommentVideoId) return;
    const d = await callApi("research_comments", { video_id: researchCommentVideoId, limit: 100 });
    if (d?.data?.comments) setResearchComments(d.data.comments);
  };

  const fetchCreatorInfo = async () => {
    const d = await callApi("get_creator_info");
    if (d?.data) setCreatorInfo(d.data);
  };

  const refreshToken = async () => {
    const d = await callApi("refresh_token", {});
    if (d?.data?.access_token) toast.success("Token refreshed successfully");
    else toast.error("Token refresh failed — you may need to re-connect");
  };

  const renderModule = (id: string) => {
    switch (id) {
      case "dashboard":
        return (
          <div className="space-y-3">
            <Button size="sm" onClick={fetchProfile} disabled={loading || !selectedAccount}><RefreshCw className="h-3.5 w-3.5 mr-1" />Sync TikTok Profile</Button>
            {!selectedAccount && <p className="text-xs text-destructive">No account selected — connect TikTok first via the Connect tab.</p>}
            {profile && (
              <Card className="border-cyan-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {(profile.avatar_url || profile.avatar_url_100) && <img src={profile.avatar_url || profile.avatar_url_100} className="h-12 w-12 rounded-full object-cover" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
                        {profile.display_name}
                        {profile.is_verified && <Badge className="bg-cyan-500/20 text-cyan-400 text-[9px]">Verified</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">@{profile.username}</p>
                      {profile.bio_description && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{profile.bio_description}</p>}
                    </div>
                    <TikTokIcon className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-muted/50 rounded p-2"><p className="text-sm font-bold text-foreground">{(profile.follower_count || 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Followers</p></div>
                    <div className="bg-muted/50 rounded p-2"><p className="text-sm font-bold text-foreground">{(profile.following_count || 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Following</p></div>
                    <div className="bg-muted/50 rounded p-2"><p className="text-sm font-bold text-foreground">{(profile.likes_count || 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Likes</p></div>
                    <div className="bg-muted/50 rounded p-2"><p className="text-sm font-bold text-foreground">{(profile.video_count || 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Videos</p></div>
                  </div>
                  {profile.profile_deep_link && (
                    <a href={profile.profile_deep_link} target="_blank" rel="noreferrer" className="text-[10px] text-cyan-400 hover:underline mt-2 inline-flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />Open TikTok Profile
                    </a>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "videos":
        return (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button size="sm" onClick={() => fetchVideos()} disabled={loading || !selectedAccount}><RefreshCw className="h-3.5 w-3.5 mr-1" />Load Videos</Button>
              {videosHasMore && videosCursor && (
                <Button size="sm" variant="outline" onClick={() => fetchVideos(videosCursor)} disabled={loading}>Load More</Button>
              )}
            </div>
            {videos.length > 0 ? (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2">
                  {videos.map((v: any) => (
                    <div key={v.id} className="bg-muted/30 rounded-lg p-3 flex gap-3">
                      {v.cover_image_url && <img src={v.cover_image_url} className="h-16 w-12 rounded object-cover flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground line-clamp-1">{v.title || v.video_description || "Untitled"}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{v.video_description}</p>
                        <div className="flex gap-3 mt-1.5 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{(v.view_count || 0).toLocaleString()}</span>
                          <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" />{(v.like_count || 0).toLocaleString()}</span>
                          <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{(v.comment_count || 0).toLocaleString()}</span>
                          <span className="flex items-center gap-0.5"><Share2 className="h-3 w-3" />{(v.share_count || 0).toLocaleString()}</span>
                          {v.duration && <span><Clock className="h-3 w-3 inline" /> {v.duration}s</span>}
                        </div>
                        <div className="flex gap-2 mt-1">
                          {v.share_url && <a href={v.share_url} target="_blank" rel="noreferrer" className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5"><ExternalLink className="h-3 w-3" />View</a>}
                          <button onClick={() => { setCommentsVideoId(v.id); toggleSection("comments"); }} className="text-[10px] text-amber-400 hover:underline flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />Comments</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">No videos loaded yet</p>
            )}
          </div>
        );

      case "publish-video":
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Input value={publishVideoTitle} onChange={e => setPublishVideoTitle(e.target.value)} placeholder="Video title / caption" className="text-sm" />
              <Input value={publishVideoUrl} onChange={e => setPublishVideoUrl(e.target.value)} placeholder="Video URL (pull from URL)" className="text-sm" />
              <select value={publishPrivacy} onChange={e => setPublishPrivacy(e.target.value)} className="w-full bg-background border border-border text-foreground rounded-lg px-2 py-1.5 text-sm">
                <option value="PUBLIC_TO_EVERYONE">Public</option>
                <option value="MUTUAL_FOLLOW_FRIENDS">Friends Only</option>
                <option value="FOLLOWER_OF_CREATOR">Followers Only</option>
                <option value="SELF_ONLY">Private (Self Only)</option>
              </select>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <label className="flex items-center gap-1.5"><Switch checked={disableDuet} onCheckedChange={setDisableDuet} className="scale-75" />Disable Duet</label>
                <label className="flex items-center gap-1.5"><Switch checked={disableComment} onCheckedChange={setDisableComment} className="scale-75" />Disable Comments</label>
                <label className="flex items-center gap-1.5"><Switch checked={disableStitch} onCheckedChange={setDisableStitch} className="scale-75" />Disable Stitch</label>
              </div>
              <Button size="sm" onClick={publishVideoByUrl} disabled={loading || !selectedAccount || !publishVideoUrl}>
                <Upload className="h-3.5 w-3.5 mr-1" />Publish Video
              </Button>
            </div>
            <div className="border-t border-border pt-3 space-y-2">
              <h5 className="text-xs font-semibold text-foreground">Check Publish Status</h5>
              <div className="flex gap-2">
                <Input value={publishId} onChange={e => setPublishId(e.target.value)} placeholder="Publish ID" className="text-sm flex-1" />
                <Button size="sm" variant="outline" onClick={checkPublishStatus} disabled={loading || !publishId}>Check</Button>
              </div>
              {publishStatus && (
                <pre className="text-[10px] bg-muted/50 rounded p-2 overflow-auto max-h-32">{JSON.stringify(publishStatus, null, 2)}</pre>
              )}
            </div>
          </div>
        );

      case "publish-photo":
        return (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button size="sm" variant={mediaType === "PHOTO" ? "default" : "outline"} onClick={() => setMediaType("PHOTO")}><Image className="h-3.5 w-3.5 mr-1" />Single Photo</Button>
              <Button size="sm" variant={mediaType === "CAROUSEL" ? "default" : "outline"} onClick={() => setMediaType("CAROUSEL")}><Layers className="h-3.5 w-3.5 mr-1" />Carousel</Button>
            </div>
            <Input value={photoTitle} onChange={e => setPhotoTitle(e.target.value)} placeholder="Title" className="text-sm" />
            <Input value={photoDesc} onChange={e => setPhotoDesc(e.target.value)} placeholder="Description" className="text-sm" />
            <Textarea value={photoUrls} onChange={e => setPhotoUrls(e.target.value)} placeholder="Image URLs (one per line)" rows={3} className="text-sm" />
            <select value={photoPrivacy} onChange={e => setPhotoPrivacy(e.target.value)} className="w-full bg-background border border-border text-foreground rounded-lg px-2 py-1.5 text-sm">
              <option value="PUBLIC_TO_EVERYONE">Public</option>
              <option value="MUTUAL_FOLLOW_FRIENDS">Friends Only</option>
              <option value="FOLLOWER_OF_CREATOR">Followers Only</option>
              <option value="SELF_ONLY">Private</option>
            </select>
            <Button size="sm" onClick={publishPhoto} disabled={loading || !selectedAccount || !photoUrls}>
              <Upload className="h-3.5 w-3.5 mr-1" />Publish {mediaType === "CAROUSEL" ? "Carousel" : "Photo"}
            </Button>
          </div>
        );

      case "playlists":
        return (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button size="sm" onClick={fetchPlaylists} disabled={loading || !selectedAccount}><RefreshCw className="h-3.5 w-3.5 mr-1" />Load Playlists</Button>
            </div>
            <div className="flex gap-2">
              <Input value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} placeholder="New playlist name" className="text-sm flex-1" />
              <Button size="sm" onClick={createPlaylist} disabled={loading || !newPlaylistName}>Create</Button>
            </div>
            {playlists.length > 0 ? (
              <div className="space-y-1.5">
                {playlists.map((p: any, i: number) => (
                  <div key={i} className="bg-muted/30 rounded p-2 flex items-center justify-between">
                    <span className="text-xs text-foreground">{p.playlist_name || p.name || `Playlist ${i + 1}`}</span>
                    <Badge variant="outline" className="text-[10px]">{p.video_count || 0} videos</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-3">No playlists loaded</p>
            )}
          </div>
        );

      case "comments":
        return (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input value={commentsVideoId} onChange={e => setCommentsVideoId(e.target.value)} placeholder="Video ID" className="text-sm flex-1" />
              <Button size="sm" onClick={fetchComments} disabled={loading || !commentsVideoId}>Load Comments</Button>
            </div>
            {comments.length > 0 ? (
              <ScrollArea className="max-h-[350px]">
                <div className="space-y-2">
                  {comments.map((c: any) => (
                    <div key={c.id} className="bg-muted/30 rounded-lg p-2.5">
                      <p className="text-xs text-foreground">{c.text}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span><Heart className="h-3 w-3 inline" /> {c.like_count || 0}</span>
                        <span><MessageSquare className="h-3 w-3 inline" /> {c.reply_count || 0} replies</span>
                        {c.create_time && <span><Clock className="h-3 w-3 inline" /> {new Date(c.create_time * 1000).toLocaleDateString()}</span>}
                      </div>
                      {replyingTo === c.id ? (
                        <div className="flex gap-1.5 mt-2">
                          <Input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Reply..." className="text-xs h-7 flex-1" onKeyDown={e => e.key === "Enter" && replyToComment(c.id)} />
                          <Button size="sm" className="h-7 text-[10px]" onClick={() => replyToComment(c.id)} disabled={loading}>Send</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setReplyingTo(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <button onClick={() => setReplyingTo(c.id)} className="text-[10px] text-cyan-400 hover:underline mt-1">Reply</button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-3">No comments loaded</p>
            )}
          </div>
        );

      case "dms":
        return (
          <div className="space-y-3">
            <Button size="sm" onClick={fetchConversations} disabled={loading || !selectedAccount}><RefreshCw className="h-3.5 w-3.5 mr-1" />Load Conversations</Button>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1 space-y-1">
                {conversations.length > 0 ? conversations.map((c: any, i: number) => (
                  <button key={i} onClick={() => fetchMessages(c.conversation_id || c.id)} className={`w-full text-left p-2 rounded text-xs transition ${selectedConvo === (c.conversation_id || c.id) ? "bg-cyan-500/10 border border-cyan-500/30" : "bg-muted/30 hover:bg-muted/50"}`}>
                    <p className="text-foreground font-medium truncate">{c.participant?.display_name || `Conversation ${i + 1}`}</p>
                  </button>
                )) : <p className="text-[10px] text-muted-foreground">No conversations</p>}
              </div>
              <div className="col-span-2 space-y-2">
                {selectedConvo ? (
                  <>
                    <ScrollArea className="max-h-[250px]">
                      <div className="space-y-1.5">
                        {messages.map((m: any, i: number) => (
                          <div key={i} className={`p-2 rounded text-xs ${m.sender === "self" ? "bg-cyan-500/10 ml-6" : "bg-muted/30 mr-6"}`}>
                            <p className="text-foreground">{m.content?.text || m.text || JSON.stringify(m.content)}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="flex gap-1.5">
                      <Input value={dmText} onChange={e => setDmText(e.target.value)} placeholder="Type a message..." className="text-xs flex-1" onKeyDown={e => e.key === "Enter" && sendDm()} />
                      <Button size="sm" onClick={sendDm} disabled={loading || !dmText}><Send className="h-3.5 w-3.5" /></Button>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-8">Select a conversation</p>
                )}
              </div>
            </div>
          </div>
        );

      case "research-users":
        return (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input value={researchUsername} onChange={e => setResearchUsername(e.target.value)} placeholder="TikTok username" className="text-sm flex-1" onKeyDown={e => e.key === "Enter" && researchUser()} />
              <Button size="sm" onClick={researchUser} disabled={loading || !researchUsername}><Search className="h-3.5 w-3.5 mr-1" />Lookup</Button>
            </div>
            {researchUserResult && (
              <Card className="border-cyan-500/20">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3 mb-2">
                    {researchUserResult.avatar_url && <img src={researchUserResult.avatar_url} className="h-10 w-10 rounded-full" />}
                    <div>
                      <p className="text-sm font-semibold text-foreground">{researchUserResult.display_name}</p>
                      <p className="text-[10px] text-muted-foreground">{researchUserResult.bio_description}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    <div className="bg-muted/50 rounded p-1.5"><p className="text-sm font-bold text-foreground">{(researchUserResult.follower_count || 0).toLocaleString()}</p><p className="text-[9px] text-muted-foreground">Followers</p></div>
                    <div className="bg-muted/50 rounded p-1.5"><p className="text-sm font-bold text-foreground">{(researchUserResult.following_count || 0).toLocaleString()}</p><p className="text-[9px] text-muted-foreground">Following</p></div>
                    <div className="bg-muted/50 rounded p-1.5"><p className="text-sm font-bold text-foreground">{(researchUserResult.likes_count || 0).toLocaleString()}</p><p className="text-[9px] text-muted-foreground">Likes</p></div>
                    <div className="bg-muted/50 rounded p-1.5"><p className="text-sm font-bold text-foreground">{(researchUserResult.video_count || 0).toLocaleString()}</p><p className="text-[9px] text-muted-foreground">Videos</p></div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "research-videos":
        return (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input value={researchKeywords} onChange={e => setResearchKeywords(e.target.value)} placeholder="Keywords (comma separated)" className="text-sm flex-1" onKeyDown={e => e.key === "Enter" && researchVideoSearch()} />
              <Button size="sm" onClick={researchVideoSearch} disabled={loading || !researchKeywords}><Search className="h-3.5 w-3.5 mr-1" />Search</Button>
            </div>
            {researchVideoResults.length > 0 && (
              <ScrollArea className="max-h-[350px]">
                <div className="space-y-1.5">
                  {researchVideoResults.map((v: any, i: number) => (
                    <div key={i} className="bg-muted/30 rounded p-2.5">
                      <p className="text-xs text-foreground line-clamp-2">{v.video_description || "No description"}</p>
                      <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span><Eye className="h-3 w-3 inline" /> {(v.view_count || 0).toLocaleString()}</span>
                        <span><Heart className="h-3 w-3 inline" /> {(v.like_count || 0).toLocaleString()}</span>
                        <span><MessageSquare className="h-3 w-3 inline" /> {(v.comment_count || 0).toLocaleString()}</span>
                        <span><Share2 className="h-3 w-3 inline" /> {(v.share_count || 0).toLocaleString()}</span>
                        {v.username && <span className="text-cyan-400">@{v.username}</span>}
                      </div>
                      {v.hashtag_names?.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {v.hashtag_names.map((h: string) => <Badge key={h} variant="outline" className="text-[9px]">#{h}</Badge>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        );

      case "research-hashtags":
        return (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input value={researchHashtags} onChange={e => setResearchHashtags(e.target.value)} placeholder="Hashtags (comma separated, no #)" className="text-sm flex-1" onKeyDown={e => e.key === "Enter" && researchHashtagSearch()} />
              <Button size="sm" onClick={researchHashtagSearch} disabled={loading || !researchHashtags}><Hash className="h-3.5 w-3.5 mr-1" />Analyze</Button>
            </div>
            {researchHashtagResults.length > 0 && (
              <div className="space-y-1.5">
                {researchHashtagResults.map((h: any, i: number) => (
                  <div key={i} className="bg-muted/30 rounded p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">#{h.name}</p>
                      <p className="text-[10px] text-muted-foreground">{(h.video_count || h.publish_count || 0).toLocaleString()} videos · {(h.view_count || 0).toLocaleString()} views</p>
                    </div>
                    <TrendingUp className="h-4 w-4 text-cyan-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "research-comments":
        return (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input value={researchCommentVideoId} onChange={e => setResearchCommentVideoId(e.target.value)} placeholder="Any TikTok video ID" className="text-sm flex-1" />
              <Button size="sm" onClick={researchCommentsFetch} disabled={loading || !researchCommentVideoId}><Search className="h-3.5 w-3.5 mr-1" />Analyze</Button>
            </div>
            {researchComments.length > 0 && (
              <ScrollArea className="max-h-[350px]">
                <div className="space-y-1.5">
                  {researchComments.map((c: any, i: number) => (
                    <div key={i} className="bg-muted/30 rounded p-2">
                      <p className="text-xs text-foreground">{c.text}</p>
                      <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                        <span><Heart className="h-3 w-3 inline" /> {c.like_count || 0}</span>
                        <span><MessageSquare className="h-3 w-3 inline" /> {c.reply_count || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        );

      case "creator-info":
        return (
          <div className="space-y-3">
            <Button size="sm" onClick={fetchCreatorInfo} disabled={loading || !selectedAccount}><Star className="h-3.5 w-3.5 mr-1" />Fetch Creator Info</Button>
            {creatorInfo && (
              <pre className="text-[10px] bg-muted/50 rounded p-3 overflow-auto max-h-[300px] text-foreground">{JSON.stringify(creatorInfo, null, 2)}</pre>
            )}
          </div>
        );

      case "token-mgmt":
        return (
          <div className="space-y-3">
            <Card className="border-amber-500/20">
              <CardContent className="p-4 space-y-3">
                <h5 className="text-sm font-semibold text-foreground flex items-center gap-2"><Shield className="h-4 w-4 text-amber-400" />Connection Health</h5>
                <p className="text-[10px] text-muted-foreground">Manage your TikTok API connection. Refresh tokens before they expire, or revoke access entirely.</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={refreshToken} disabled={loading}><RefreshCw className="h-3.5 w-3.5 mr-1" />Refresh Token</Button>
                  <Button size="sm" variant="destructive" onClick={async () => {
                    if (!confirm("Revoke TikTok access? You'll need to reconnect.")) return;
                    await callApi("revoke_token", {});
                    toast.success("TikTok access revoked");
                  }} disabled={loading}><Trash2 className="h-3.5 w-3.5 mr-1" />Revoke Access</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TikTokIcon className="h-5 w-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-foreground">TikTok Revenue Operating System</h3>
          <Badge variant="outline" className="text-[10px]">{SECTIONS.length} modules</Badge>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={expandAll} className="text-xs h-7 text-foreground">Expand All</Button>
          <Button size="sm" variant="ghost" onClick={collapseAll} className="text-xs h-7 text-foreground">Collapse All</Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-260px)]">
        <div className="space-y-3 pr-2">
          {CATEGORIES.map(cat => {
            const catSections = SECTIONS.filter(s => s.category === cat);
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider">{cat}</Badge>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-1.5">
                  {catSections.map(section => {
                    const isExpanded = expandedSections.has(section.id);
                    return (
                      <Card key={section.id} className={`transition-all ${isExpanded ? "border-cyan-500/30" : ""}`}>
                        <button
                          onClick={() => toggleSection(section.id)}
                          className="w-full p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors rounded-t-xl"
                        >
                          <div className={`h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center ${section.color}`}>
                            <section.icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-semibold text-foreground">{section.label}</p>
                            <p className="text-[10px] text-muted-foreground">{section.desc}</p>
                          </div>
                          {loading && isExpanded ? (
                            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                          ) : isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                        {isExpanded && (
                          <CardContent className="p-3 pt-0 border-t border-border">
                            {renderModule(section.id)}
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default TKAutomationSuite;

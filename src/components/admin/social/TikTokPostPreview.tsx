import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Heart, MessageCircle, Share2, Music2, Bookmark, Play } from "lucide-react";

interface TikTokPostPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: {
    caption?: string;
    media_urls?: string[];
    post_type?: string;
    metadata?: any;
    scheduled_at?: string;
    status?: string;
    engagement_data?: any;
  } | null;
  profile?: {
    display_name?: string;
    username?: string;
    avatar_url?: string;
    avatar_url_100?: string;
  } | null;
}

const TikTokIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.76 1.52V6.84a4.84 4.84 0 0 1-1-.15z"/>
  </svg>
);

export const TikTokPostPreview = ({ open, onOpenChange, post, profile }: TikTokPostPreviewProps) => {
  if (!post) return null;

  const meta = post.metadata || {};
  const contentType = meta.content_type || post.post_type || "video";
  const mediaUrl = Array.isArray(post.media_urls) && post.media_urls.length > 0 ? post.media_urls[0] : null;
  const avatar = profile?.avatar_url || profile?.avatar_url_100;
  const displayName = profile?.display_name || "Creator";
  const username = profile?.username || "creator";
  const eng = post.engagement_data as any;
  const likes = eng?.likes || 0;
  const comments = eng?.comments || 0;
  const shares = eng?.shares || 0;
  const bookmarks = eng?.bookmarks || 0;

  // Extract caption without attribution
  const caption = post.caption || "";

  const privacyLabel: Record<string, string> = {
    PUBLIC_TO_EVERYONE: "Everyone",
    MUTUAL_FOLLOW_FRIENDS: "Friends",
    FOLLOWER_OF_CREATOR: "Followers",
    SELF_ONLY: "Only me",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 bg-transparent border-none shadow-none max-w-[340px] overflow-visible [&>button]:hidden">
        {/* Phone Frame */}
        <div className="relative mx-auto w-[310px] rounded-[2.5rem] bg-black border-[3px] border-zinc-700 shadow-2xl shadow-black/60 overflow-hidden" style={{ aspectRatio: "9/19.5" }}>
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-black rounded-b-2xl z-30" />

          {/* Status bar */}
          <div className="absolute top-0 left-0 right-0 h-11 z-20 flex items-end justify-between px-6 pb-1">
            <span className="text-[10px] text-white/80 font-medium">9:41</span>
            <div className="flex gap-1 items-center">
              <div className="w-4 h-2 border border-white/50 rounded-sm relative"><div className="absolute inset-[1px] right-[2px] bg-white/80 rounded-[1px]" /></div>
            </div>
          </div>

          {/* Media background */}
          <div className="absolute inset-0 bg-zinc-900">
            {mediaUrl ? (
              contentType === "video" ? (
                <video
                  src={mediaUrl}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  autoPlay
                  loop
                  ref={el => { if (el) el.play().catch(() => {}); }}
                />
              ) : (
                <img src={mediaUrl} className="w-full h-full object-cover" alt="" />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play className="h-16 w-16 text-white/20" />
              </div>
            )}
            {/* Dark gradient overlay at bottom */}
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          </div>

          {/* Top tabs — Following | For You */}
          <div className="absolute top-12 left-0 right-0 z-20 flex items-center justify-center gap-4">
            <span className="text-[11px] text-white/50 font-medium">Following</span>
            <span className="text-[11px] text-white font-bold border-b-2 border-white pb-0.5">For You</span>
          </div>

          {/* Right side action bar */}
          <div className="absolute right-3 bottom-[100px] z-20 flex flex-col items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              {avatar ? (
                <img src={avatar} className="h-10 w-10 rounded-full border-2 border-white object-cover" alt="" />
              ) : (
                <div className="h-10 w-10 rounded-full border-2 border-white bg-zinc-700 flex items-center justify-center">
                  <TikTokIcon className="h-5 w-5 text-white" />
                </div>
              )}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-rose-500 flex items-center justify-center">
                <span className="text-[8px] text-white font-bold">+</span>
              </div>
            </div>
            {/* Likes */}
            <div className="flex flex-col items-center">
              <Heart className="h-7 w-7 text-white drop-shadow-lg" fill={likes > 0 ? "#ff2d55" : "none"} stroke={likes > 0 ? "#ff2d55" : "white"} />
              <span className="text-[10px] text-white font-medium mt-0.5">{likes > 0 ? likes.toLocaleString() : "0"}</span>
            </div>
            {/* Comments */}
            <div className="flex flex-col items-center">
              <MessageCircle className="h-7 w-7 text-white drop-shadow-lg" />
              <span className="text-[10px] text-white font-medium mt-0.5">{comments > 0 ? comments.toLocaleString() : "0"}</span>
            </div>
            {/* Bookmarks */}
            <div className="flex flex-col items-center">
              <Bookmark className="h-7 w-7 text-white drop-shadow-lg" />
              <span className="text-[10px] text-white font-medium mt-0.5">{bookmarks > 0 ? bookmarks.toLocaleString() : "0"}</span>
            </div>
            {/* Shares */}
            <div className="flex flex-col items-center">
              <Share2 className="h-7 w-7 text-white drop-shadow-lg" />
              <span className="text-[10px] text-white font-medium mt-0.5">{shares > 0 ? shares.toLocaleString() : "0"}</span>
            </div>
            {/* Spinning disc */}
            <div className="h-10 w-10 rounded-full border-[3px] border-zinc-600 bg-zinc-800 flex items-center justify-center animate-spin" style={{ animationDuration: "3s" }}>
              <Music2 className="h-4 w-4 text-white" />
            </div>
          </div>

          {/* Bottom info — username, caption, music */}
          <div className="absolute left-3 right-16 bottom-[60px] z-20 space-y-1.5">
            <p className="text-[13px] text-white font-bold drop-shadow-lg">@{username}</p>
            <p className="text-[11px] text-white/90 leading-[1.4] drop-shadow-md line-clamp-3 whitespace-pre-wrap">{caption || "No caption"}</p>
            <div className="flex items-center gap-1.5">
              <Music2 className="h-3 w-3 text-white/70" />
              <p className="text-[10px] text-white/70 truncate">Original sound — @{username}</p>
            </div>
          </div>

          {/* Bottom nav bar */}
          <div className="absolute bottom-0 left-0 right-0 h-[50px] bg-black z-20 flex items-center justify-around px-2">
            {["Home", "Friends", "", "Inbox", "Profile"].map((label, i) => (
              <div key={i} className="flex flex-col items-center justify-center">
                {i === 2 ? (
                  <div className="h-8 w-12 rounded-lg bg-gradient-to-r from-cyan-400 via-white to-rose-400 flex items-center justify-center -mt-1">
                    <div className="h-[28px] w-[44px] rounded-md bg-white flex items-center justify-center">
                      <span className="text-black text-lg font-bold leading-none">+</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={`h-5 w-5 rounded-sm ${i === 0 ? "bg-white" : "bg-white/30"}`} />
                    <span className={`text-[9px] mt-0.5 ${i === 0 ? "text-white" : "text-white/50"}`}>{label}</span>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Privacy badge */}
          {meta.privacy_level && meta.privacy_level !== "PUBLIC_TO_EVERYONE" && (
            <div className="absolute top-14 right-3 z-20 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5">
              <span className="text-[9px] text-white/80">🔒 {privacyLabel[meta.privacy_level] || meta.privacy_level}</span>
            </div>
          )}

          {/* Branded content label */}
          {meta.brand_content && (
            <div className="absolute top-14 left-3 z-20 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5">
              <span className="text-[9px] text-white/80">Paid partnership</span>
            </div>
          )}

          {/* Status overlay for non-published */}
          {post.status && post.status !== "published" && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1">
              <span className="text-[10px] text-white/90 font-medium capitalize">{post.status === "scheduled" ? `⏰ Scheduled` : post.status === "draft" ? "📝 Draft" : post.status}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

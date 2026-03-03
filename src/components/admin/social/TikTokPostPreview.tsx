import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Heart, MessageCircle, Share2, Music2, Bookmark, Play, ChevronLeft, ChevronRight, Search, Image, Layers } from "lucide-react";

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

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z"/>
  </svg>
);

const FriendsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
  </svg>
);

const InboxIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
  </svg>
);

const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
);

const formatCount = (n: number) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 10000) return (n / 1000).toFixed(0) + "K";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
};

export const TikTokPostPreview = ({ open, onOpenChange, post, profile }: TikTokPostPreviewProps) => {
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [captionExpanded, setCaptionExpanded] = useState(false);

  if (!post) return null;

  const meta = post.metadata || {};
  const contentType = meta.content_type || post.post_type || "video";
  const allMedia = Array.isArray(post.media_urls) ? post.media_urls.filter(Boolean) : [];
  const isCarousel = contentType === "carousel" || allMedia.length > 1;
  const isPhoto = contentType === "photo" || (contentType !== "video" && !isCarousel);
  const currentMedia = allMedia[carouselIdx] || allMedia[0] || null;
  const isVideoFile = contentType === "video" || (currentMedia && /\.(mp4|mov|webm|m4v|avi)/i.test(currentMedia));

  const avatar = profile?.avatar_url || profile?.avatar_url_100;
  const username = profile?.username || "creator";
  const eng = post.engagement_data as any;
  const likes = eng?.likes || 0;
  const comments = eng?.comments || 0;
  const shares = eng?.shares || 0;
  const bookmarks = eng?.bookmarks || 0;

  const caption = post.caption || "";
  const captionLines = caption.split("\n");
  const isLongCaption = captionLines.length > 2 || caption.length > 80;
  const displayCaption = captionExpanded ? caption : captionLines.slice(0, 2).join("\n").substring(0, 80);

  const privacyLabel: Record<string, string> = {
    PUBLIC_TO_EVERYONE: "Everyone",
    MUTUAL_FOLLOW_FRIENDS: "Friends",
    FOLLOWER_OF_CREATOR: "Followers",
    SELF_ONLY: "Only me",
  };

  const hasAttribution = caption.includes("Posted via Uplyze");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setCarouselIdx(0); setCaptionExpanded(false); } onOpenChange(o); }}>
      <DialogContent className="p-0 bg-transparent border-none shadow-none max-w-[380px] overflow-visible [&>button]:hidden">
        {/* Phone Frame — iPhone-style with dynamic island */}
        <div
          className="relative mx-auto w-[340px] rounded-[3rem] bg-[#000] overflow-hidden"
          style={{
            aspectRatio: "9/19.5",
            boxShadow: "0 0 0 3px #333, 0 0 0 5px #111, 0 20px 60px rgba(0,0,0,0.6), 0 0 80px hsl(var(--primary) / 0.08)",
          }}
        >
          {/* Dynamic Island */}
          <div className="absolute top-[8px] left-1/2 -translate-x-1/2 w-[100px] h-[25px] bg-black rounded-full z-40" />

          {/* Status bar */}
          <div className="absolute top-0 left-0 right-0 h-[48px] z-30 flex items-end justify-between px-8 pb-1">
            <span className="text-[11px] text-white font-semibold" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>9:41</span>
            <div className="flex gap-[3px] items-center">
              {/* Signal bars */}
              <div className="flex gap-[1px] items-end h-[10px]">
                {[3, 5, 7, 9].map((h, i) => (
                  <div key={i} className="w-[3px] rounded-[0.5px] bg-white" style={{ height: h }} />
                ))}
              </div>
              {/* WiFi */}
              <svg className="h-[11px] w-[14px] ml-[2px]" viewBox="0 0 16 12" fill="white"><path d="M8 9.6a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4zM3.76 7.04a5.92 5.92 0 018.48 0l-1.2 1.2a4.16 4.16 0 00-6.08 0l-1.2-1.2zM1.04 4.32a9.44 9.44 0 0113.92 0l-1.2 1.2a7.68 7.68 0 00-11.52 0l-1.2-1.2z"/></svg>
              {/* Battery */}
              <div className="w-[22px] h-[10px] border border-white/60 rounded-[2px] ml-[2px] relative">
                <div className="absolute inset-[1.5px] right-[2px] bg-white rounded-[0.5px]" />
                <div className="absolute -right-[3px] top-[2.5px] w-[1.5px] h-[5px] bg-white/60 rounded-r-[1px]" />
              </div>
            </div>
          </div>

          {/* Media background */}
          <div className="absolute inset-0">
            {currentMedia ? (
              isVideoFile ? (
                <video
                  key={currentMedia}
                  src={currentMedia}
                  className="w-full h-full object-cover"
                  muted playsInline autoPlay loop
                  ref={el => { if (el) el.play().catch(() => {}); }}
                />
              ) : (
                <img src={currentMedia} className="w-full h-full object-cover" alt="" />
              )
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-zinc-800 to-zinc-900 flex flex-col items-center justify-center gap-3">
                {contentType === "video" ? <Play className="h-16 w-16 text-white/15" /> : <Image className="h-16 w-16 text-white/15" />}
                <span className="text-[11px] text-white/20 font-medium">No media uploaded</span>
              </div>
            )}
            {/* Gradient overlays */}
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          </div>

          {/* Carousel navigation */}
          {isCarousel && allMedia.length > 1 && (
            <>
              {carouselIdx > 0 && (
                <button onClick={() => setCarouselIdx(i => i - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 z-30 h-8 w-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                  <ChevronLeft className="h-5 w-5 text-white" />
                </button>
              )}
              {carouselIdx < allMedia.length - 1 && (
                <button onClick={() => setCarouselIdx(i => i + 1)} className="absolute right-14 top-1/2 -translate-y-1/2 z-30 h-8 w-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                  <ChevronRight className="h-5 w-5 text-white" />
                </button>
              )}
              {/* Dot indicators */}
              <div className="absolute top-[56px] left-1/2 -translate-x-1/2 z-30 flex gap-1">
                {allMedia.map((_, i) => (
                  <div key={i} className={`h-[5px] rounded-full transition-all ${i === carouselIdx ? "w-4 bg-white" : "w-[5px] bg-white/40"}`} />
                ))}
              </div>
              {/* Counter badge */}
              <div className="absolute top-[56px] right-3 z-30 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
                <Layers className="h-2.5 w-2.5 text-white/80" />
                <span className="text-[9px] text-white/80 font-medium">{carouselIdx + 1}/{allMedia.length}</span>
              </div>
            </>
          )}

          {/* Photo badge */}
          {isPhoto && !isCarousel && currentMedia && (
            <div className="absolute top-[56px] right-3 z-30 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
              <Image className="h-2.5 w-2.5 text-white/80" />
              <span className="text-[9px] text-white/80 font-medium">Photo</span>
            </div>
          )}

          {/* Top tabs — Following | For You */}
          <div className="absolute top-[50px] left-0 right-0 z-20 flex items-center justify-center gap-5">
            <div className="flex items-center gap-1 opacity-50">
              <span className="text-[13px] text-white font-medium">Following</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[13px] text-white font-bold">For You</span>
              <div className="h-[2px] w-8 bg-white rounded-full mt-0.5" />
            </div>
            <Search className="h-4 w-4 text-white/70 absolute right-4" />
          </div>

          {/* LIVE / Uplyze badge */}
          <div className="absolute top-[80px] left-3 z-20 flex items-center gap-1.5">
            {meta.brand_content && (
              <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-md px-2 py-0.5">
                <span className="text-[9px] text-white font-medium">Paid partnership</span>
              </div>
            )}
          </div>

          {/* Right side action bar */}
          <div className="absolute right-3 bottom-[90px] z-20 flex flex-col items-center gap-[18px]">
            {/* Avatar with follow button */}
            <div className="relative mb-1">
              {avatar ? (
                <img src={avatar} className="h-[44px] w-[44px] rounded-full border-[2px] border-white object-cover" alt="" />
              ) : (
                <div className="h-[44px] w-[44px] rounded-full border-[2px] border-white bg-zinc-700 flex items-center justify-center">
                  <TikTokIcon className="h-5 w-5 text-white" />
                </div>
              )}
              <div className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 h-[18px] w-[18px] rounded-full bg-[#fe2c55] flex items-center justify-center shadow-lg shadow-rose-500/30">
                <span className="text-[11px] text-white font-bold leading-none">+</span>
              </div>
            </div>

            {/* Likes */}
            <button className="flex flex-col items-center group">
              <Heart className="h-[28px] w-[28px] text-white drop-shadow-lg group-hover:scale-110 transition-transform" fill={likes > 0 ? "#fe2c55" : "none"} stroke={likes > 0 ? "#fe2c55" : "white"} strokeWidth={2} />
              <span className="text-[11px] text-white font-medium mt-[2px]">{formatCount(likes)}</span>
            </button>

            {/* Comments */}
            <button className="flex flex-col items-center group">
              <MessageCircle className="h-[28px] w-[28px] text-white drop-shadow-lg group-hover:scale-110 transition-transform" strokeWidth={2} />
              <span className="text-[11px] text-white font-medium mt-[2px]">{formatCount(comments)}</span>
            </button>

            {/* Bookmarks */}
            <button className="flex flex-col items-center group">
              <Bookmark className="h-[28px] w-[28px] text-white drop-shadow-lg group-hover:scale-110 transition-transform" strokeWidth={2} />
              <span className="text-[11px] text-white font-medium mt-[2px]">{formatCount(bookmarks)}</span>
            </button>

            {/* Shares */}
            <button className="flex flex-col items-center group">
              <Share2 className="h-[28px] w-[28px] text-white drop-shadow-lg group-hover:scale-110 transition-transform" strokeWidth={2} />
              <span className="text-[11px] text-white font-medium mt-[2px]">{formatCount(shares)}</span>
            </button>

            {/* Spinning vinyl disc */}
            <div className="relative h-[40px] w-[40px]">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border-[3px] border-zinc-600 animate-spin flex items-center justify-center" style={{ animationDuration: "4s" }}>
                <div className="h-[14px] w-[14px] rounded-full bg-zinc-400/30 border border-zinc-500/50" />
              </div>
              {avatar && (
                <img src={avatar} className="absolute inset-[8px] rounded-full object-cover" alt="" />
              )}
            </div>
          </div>

          {/* Bottom info — username, caption, sound */}
          <div className="absolute left-3 right-[60px] bottom-[68px] z-20 space-y-[6px]">
            {/* Username */}
            <p className="text-[14px] text-white font-bold drop-shadow-lg" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
              @{username}
            </p>

            {/* Caption with "Posted via Uplyze" highlighted */}
            <div className="relative">
              <p className="text-[12px] text-white/90 leading-[1.45] drop-shadow-md whitespace-pre-wrap" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>
                {(() => {
                  const text = captionExpanded ? caption : displayCaption;
                  if (hasAttribution) {
                    const parts = text.split("Posted via Uplyze");
                    return (
                      <>
                        {parts[0]}
                        {text.includes("Posted via Uplyze") && (
                          <span className="text-cyan-300 font-medium">Posted via Uplyze</span>
                        )}
                        {parts[1] || ""}
                      </>
                    );
                  }
                  return text;
                })()}
                {!captionExpanded && isLongCaption && (
                  <button onClick={() => setCaptionExpanded(true)} className="text-white/60 font-medium ml-1">... more</button>
                )}
                {captionExpanded && isLongCaption && (
                  <button onClick={() => setCaptionExpanded(false)} className="text-white/60 font-medium ml-1 block">Show less</button>
                )}
              </p>
            </div>

            {/* Hashtags rendered as blue text */}
            {meta.hashtags && Array.isArray(meta.hashtags) && meta.hashtags.length > 0 && (
              <p className="text-[11px] text-cyan-300/90 drop-shadow-md truncate">
                {meta.hashtags.map((h: string) => `#${h}`).join(" ")}
              </p>
            )}

            {/* Sound / music row with marquee */}
            <div className="flex items-center gap-[6px]">
              <Music2 className="h-[12px] w-[12px] text-white/80 flex-shrink-0" />
              <div className="overflow-hidden flex-1">
                <p className="text-[11px] text-white/80 whitespace-nowrap animate-marquee" style={{ animation: "marquee 8s linear infinite" }}>
                  Original sound — @{username} ♪
                </p>
              </div>
            </div>
          </div>

          {/* Bottom nav bar */}
          <div className="absolute bottom-0 left-0 right-0 h-[56px] bg-black/95 z-20 flex items-center justify-around px-3 pt-0.5 pb-[6px]">
            {[
              { icon: HomeIcon, label: "Home", active: true },
              { icon: FriendsIcon, label: "Friends", active: false },
              { icon: null, label: "", active: false },
              { icon: InboxIcon, label: "Inbox", active: false },
              { icon: ProfileIcon, label: "Profile", active: false },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center justify-center w-12">
                {i === 2 ? (
                  <div className="relative h-[30px] w-[44px] -mt-0.5">
                    <div className="absolute inset-0 rounded-lg bg-[#25f4ee] translate-x-[-3px]" />
                    <div className="absolute inset-0 rounded-lg bg-[#fe2c55] translate-x-[3px]" />
                    <div className="absolute inset-0 rounded-lg bg-white flex items-center justify-center">
                      <span className="text-black text-xl font-bold leading-none">+</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {item.icon && <item.icon />}
                    <span className={`text-[9px] mt-[2px] ${item.active ? "text-white font-medium" : "text-white/50"}`}>{item.label}</span>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Privacy badge (non-public) */}
          {meta.privacy_level && meta.privacy_level !== "PUBLIC_TO_EVERYONE" && (
            <div className="absolute top-[80px] right-3 z-20 bg-black/50 backdrop-blur-md border border-white/10 rounded-md px-2 py-0.5">
              <span className="text-[9px] text-white/90 font-medium">🔒 {privacyLabel[meta.privacy_level] || meta.privacy_level}</span>
            </div>
          )}

          {/* Status overlay for draft/scheduled */}
          {post.status && post.status !== "published" && (
            <div className="absolute top-[104px] left-1/2 -translate-x-1/2 z-30 bg-black/70 backdrop-blur-md border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${post.status === "scheduled" ? "bg-amber-400 animate-pulse" : post.status === "publishing" ? "bg-blue-400 animate-pulse" : "bg-white/40"}`} />
              <span className="text-[11px] text-white/90 font-medium capitalize">
                {post.status === "scheduled"
                  ? `Scheduled${post.scheduled_at ? ` · ${new Date(post.scheduled_at).toLocaleDateString([], { month: "short", day: "numeric" })}` : ""}`
                  : post.status === "draft" ? "Draft — Not posted yet"
                  : post.status === "publishing" ? "Publishing…"
                  : post.status}
              </span>
            </div>
          )}

          {/* Home indicator */}
          <div className="absolute bottom-[4px] left-1/2 -translate-x-1/2 w-[120px] h-[4px] rounded-full bg-white/30 z-30" />
        </div>

        {/* Marquee keyframes */}
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Heart, MessageCircle, Send, Bookmark, ChevronLeft, ChevronRight, MoreHorizontal, Image, Layers, Instagram } from "lucide-react";

interface InstagramPostPreviewProps {
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
    profile_picture_url?: string;
  } | null;
}

const formatCount = (n: number) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 10000) return (n / 1000).toFixed(0) + "K";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
};

export const InstagramPostPreview = ({ open, onOpenChange, post, profile }: InstagramPostPreviewProps) => {
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!post) return null;

  const meta = post.metadata || {};
  const contentType = meta.content_type || post.post_type || "feed";
  const allMedia = Array.isArray(post.media_urls) ? post.media_urls.filter(Boolean) : [];
  const isCarousel = contentType === "carousel" || allMedia.length > 1;
  const isReel = contentType === "reel";
  const currentMedia = allMedia[carouselIdx] || allMedia[0] || null;
  const isVideoFile = isReel || (currentMedia && /\.(mp4|mov|webm|m4v|avi)/i.test(currentMedia));

  const avatar = profile?.profile_picture_url || profile?.avatar_url;
  const username = profile?.username || "creator";
  const eng = post.engagement_data as any;
  const likes = eng?.likes || 0;
  const comments = eng?.comments || 0;

  const caption = post.caption || "";
  const captionLines = caption.split("\n");
  const isLongCaption = captionLines.length > 2 || caption.length > 100;
  const displayCaption = captionExpanded ? caption : captionLines.slice(0, 2).join("\n").substring(0, 100);
  const hasAttribution = caption.includes("Posted via Uplyze");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setCarouselIdx(0); setCaptionExpanded(false); } onOpenChange(o); }}>
      <DialogContent className="p-0 bg-transparent border-none shadow-none max-w-[380px] overflow-visible [&>button]:hidden">
        {/* Phone Frame — iPhone-style */}
        <div
          className="relative mx-auto w-[340px] rounded-[3rem] bg-[#000] overflow-hidden"
          style={{
            aspectRatio: isReel ? "9/19.5" : "9/16",
            boxShadow: "0 0 0 3px #333, 0 0 0 5px #111, 0 20px 60px rgba(0,0,0,0.6), 0 0 80px hsl(var(--primary) / 0.08)",
          }}
        >
          {/* Dynamic Island */}
          <div className="absolute top-[8px] left-1/2 -translate-x-1/2 w-[100px] h-[25px] bg-black rounded-full z-40" />

          {/* Status bar */}
          <div className="absolute top-0 left-0 right-0 h-[48px] z-30 flex items-end justify-between px-8 pb-1">
            <span className="text-[11px] text-white font-semibold" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>9:41</span>
            <div className="flex gap-[3px] items-center">
              <div className="flex gap-[1px] items-end h-[10px]">
                {[3, 5, 7, 9].map((h, i) => (
                  <div key={i} className="w-[3px] rounded-[0.5px] bg-white" style={{ height: h }} />
                ))}
              </div>
              <svg className="h-[11px] w-[14px] ml-[2px]" viewBox="0 0 16 12" fill="white"><path d="M8 9.6a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4zM3.76 7.04a5.92 5.92 0 018.48 0l-1.2 1.2a4.16 4.16 0 00-6.08 0l-1.2-1.2zM1.04 4.32a9.44 9.44 0 0113.92 0l-1.2 1.2a7.68 7.68 0 00-11.52 0l-1.2-1.2z" /></svg>
              <div className="w-[22px] h-[10px] border border-white/60 rounded-[2px] ml-[2px] relative">
                <div className="absolute inset-[1.5px] right-[2px] bg-white rounded-[0.5px]" />
                <div className="absolute -right-[3px] top-[2.5px] w-[1.5px] h-[5px] bg-white/60 rounded-r-[1px]" />
              </div>
            </div>
          </div>

          {isReel ? (
            /* ===== REEL LAYOUT (full-screen like TikTok) ===== */
            <>
              <div className="absolute inset-0">
                {currentMedia ? (
                  isVideoFile ? (
                    <video key={currentMedia} src={currentMedia} className="w-full h-full object-cover" muted playsInline autoPlay loop ref={el => { if (el) el.play().catch(() => {}); }} />
                  ) : (
                    <img src={currentMedia} className="w-full h-full object-cover" alt="" />
                  )
                ) : (
                  <div className="w-full h-full bg-gradient-to-b from-zinc-800 to-zinc-900 flex flex-col items-center justify-center gap-3">
                    <Instagram className="h-16 w-16 text-white/15" />
                    <span className="text-[11px] text-white/20 font-medium">No media uploaded</span>
                  </div>
                )}
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              </div>

              {/* Reels top bar */}
              <div className="absolute top-[50px] left-0 right-0 z-20 flex items-center justify-between px-4">
                <span className="text-[15px] text-white font-bold">Reels</span>
                <Instagram className="h-5 w-5 text-white/70" />
              </div>

              {/* Right side action bar */}
              <div className="absolute right-3 bottom-[90px] z-20 flex flex-col items-center gap-[18px]">
                <div className="relative mb-1">
                  {avatar ? (
                    <img src={avatar} className="h-[40px] w-[40px] rounded-full border-[2px] border-white object-cover" alt="" />
                  ) : (
                    <div className="h-[40px] w-[40px] rounded-full border-[2px] border-white bg-zinc-700 flex items-center justify-center">
                      <Instagram className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 h-[18px] w-[18px] rounded-full bg-[#0095f6] flex items-center justify-center shadow-lg">
                    <span className="text-[11px] text-white font-bold leading-none">+</span>
                  </div>
                </div>
                <button className="flex flex-col items-center" onClick={() => setLiked(!liked)}>
                  <Heart className="h-[26px] w-[26px] drop-shadow-lg transition-transform hover:scale-110" fill={liked ? "#ed4956" : "none"} stroke={liked ? "#ed4956" : "white"} strokeWidth={2} />
                  <span className="text-[11px] text-white font-medium mt-[2px]">{formatCount(likes + (liked ? 1 : 0))}</span>
                </button>
                <button className="flex flex-col items-center">
                  <MessageCircle className="h-[26px] w-[26px] text-white drop-shadow-lg hover:scale-110 transition-transform" strokeWidth={2} />
                  <span className="text-[11px] text-white font-medium mt-[2px]">{formatCount(comments)}</span>
                </button>
                <button className="flex flex-col items-center">
                  <Send className="h-[26px] w-[26px] text-white drop-shadow-lg hover:scale-110 transition-transform" strokeWidth={2} />
                </button>
                <button onClick={() => setSaved(!saved)}>
                  <Bookmark className="h-[26px] w-[26px] drop-shadow-lg hover:scale-110 transition-transform" fill={saved ? "white" : "none"} stroke="white" strokeWidth={2} />
                </button>
                {/* Audio disc */}
                <div className="h-[28px] w-[28px] rounded-md border border-white/40 overflow-hidden animate-spin" style={{ animationDuration: "4s" }}>
                  {avatar ? <img src={avatar} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-500" />}
                </div>
              </div>

              {/* Bottom info */}
              <div className="absolute left-3 right-[55px] bottom-[68px] z-20 space-y-[6px]">
                <p className="text-[14px] text-white font-bold drop-shadow-lg">@{username}</p>
                <div className="relative">
                  <p className="text-[12px] text-white/90 leading-[1.45] drop-shadow-md whitespace-pre-wrap">
                    {(() => {
                      const text = captionExpanded ? caption : displayCaption;
                      if (hasAttribution) {
                        const parts = text.split("Posted via Uplyze");
                        return <>{parts[0]}{text.includes("Posted via Uplyze") && <span className="text-[#0095f6] font-medium">Posted via Uplyze</span>}{parts[1] || ""}</>;
                      }
                      return text;
                    })()}
                    {!captionExpanded && isLongCaption && <button onClick={() => setCaptionExpanded(true)} className="text-white/60 font-medium ml-1">... more</button>}
                  </p>
                </div>
                <div className="flex items-center gap-[6px]">
                  <div className="h-[14px] w-[14px] rounded-md overflow-hidden border border-white/30">
                    {avatar ? <img src={avatar} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-500" />}
                  </div>
                  <p className="text-[11px] text-white/80">@{username} · Original audio</p>
                </div>
              </div>

              {/* Bottom nav */}
              <div className="absolute bottom-0 left-0 right-0 h-[50px] bg-black/95 z-20 flex items-center justify-around px-5 pt-0.5 pb-[6px]">
                {["Home", "Search", "＋", "Reels", "Profile"].map((label, i) => (
                  <div key={i} className="flex flex-col items-center">
                    {i === 2 ? (
                      <div className="h-[28px] w-[28px] rounded-lg border-2 border-white/80 flex items-center justify-center"><span className="text-white text-lg leading-none">+</span></div>
                    ) : (
                      <span className={`text-[10px] ${i === 3 ? "text-white font-bold" : "text-white/50"}`}>{label}</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* ===== FEED/CAROUSEL LAYOUT ===== */
            <div className="absolute inset-0 flex flex-col bg-black">
              {/* Top bar */}
              <div className="pt-[52px] px-3 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {avatar ? (
                    <div className="h-[32px] w-[32px] rounded-full bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] p-[2px]">
                      <img src={avatar} className="h-full w-full rounded-full object-cover border-2 border-black" alt="" />
                    </div>
                  ) : (
                    <div className="h-[32px] w-[32px] rounded-full bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] flex items-center justify-center">
                      <Instagram className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div>
                    <p className="text-[13px] text-white font-semibold leading-none">{username}</p>
                    {meta.location && <p className="text-[10px] text-white/50 mt-0.5">{meta.location}</p>}
                  </div>
                </div>
                <MoreHorizontal className="h-5 w-5 text-white/70" />
              </div>

              {/* Media area */}
              <div className="relative flex-1 bg-zinc-900">
                {currentMedia ? (
                  isVideoFile ? (
                    <video key={currentMedia} src={currentMedia} className="w-full h-full object-contain" muted playsInline autoPlay loop ref={el => { if (el) el.play().catch(() => {}); }} />
                  ) : (
                    <img src={currentMedia} className="w-full h-full object-contain" alt="" />
                  )
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                    <Image className="h-16 w-16 text-white/10" />
                    <span className="text-[11px] text-white/20">No media uploaded</span>
                  </div>
                )}

                {/* Carousel nav */}
                {isCarousel && allMedia.length > 1 && (
                  <>
                    {carouselIdx > 0 && (
                      <button onClick={() => setCarouselIdx(i => i - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                        <ChevronLeft className="h-4 w-4 text-white" />
                      </button>
                    )}
                    {carouselIdx < allMedia.length - 1 && (
                      <button onClick={() => setCarouselIdx(i => i + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                        <ChevronRight className="h-4 w-4 text-white" />
                      </button>
                    )}
                    <div className="absolute top-2 right-2 z-10 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
                      <Layers className="h-2.5 w-2.5 text-white/80" />
                      <span className="text-[9px] text-white/80 font-medium">{carouselIdx + 1}/{allMedia.length}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Action row */}
              <div className="px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button onClick={() => setLiked(!liked)}>
                    <Heart className="h-[24px] w-[24px] transition-transform hover:scale-110" fill={liked ? "#ed4956" : "none"} stroke={liked ? "#ed4956" : "white"} strokeWidth={2} />
                  </button>
                  <MessageCircle className="h-[24px] w-[24px] text-white hover:scale-110 transition-transform cursor-pointer" strokeWidth={2} />
                  <Send className="h-[22px] w-[22px] text-white hover:scale-110 transition-transform cursor-pointer -rotate-[25deg]" strokeWidth={2} />
                </div>
                {isCarousel && allMedia.length > 1 && (
                  <div className="flex gap-[4px]">
                    {allMedia.map((_, i) => (
                      <div key={i} className={`h-[6px] w-[6px] rounded-full transition-colors ${i === carouselIdx ? "bg-[#0095f6]" : "bg-white/30"}`} />
                    ))}
                  </div>
                )}
                <button onClick={() => setSaved(!saved)}>
                  <Bookmark className="h-[24px] w-[24px] hover:scale-110 transition-transform" fill={saved ? "white" : "none"} stroke="white" strokeWidth={2} />
                </button>
              </div>

              {/* Likes count */}
              <div className="px-3 pb-1">
                <p className="text-[13px] text-white font-semibold">{formatCount(likes + (liked ? 1 : 0))} likes</p>
              </div>

              {/* Caption */}
              <div className="px-3 pb-2">
                <p className="text-[12px] text-white/90 leading-[1.45]">
                  <span className="font-semibold text-white mr-1">{username}</span>
                  {(() => {
                    const text = captionExpanded ? caption : displayCaption;
                    if (hasAttribution) {
                      const parts = text.split("Posted via Uplyze");
                      return <>{parts[0]}{text.includes("Posted via Uplyze") && <span className="text-[#0095f6] font-medium">Posted via Uplyze</span>}{parts[1] || ""}</>;
                    }
                    return text;
                  })()}
                  {!captionExpanded && isLongCaption && <button onClick={() => setCaptionExpanded(true)} className="text-white/40 ml-1">more</button>}
                  {captionExpanded && isLongCaption && <button onClick={() => setCaptionExpanded(false)} className="text-white/40 ml-1 block mt-1">Show less</button>}
                </p>
              </div>

              {/* Comments preview */}
              {comments > 0 && (
                <p className="px-3 text-[12px] text-white/40 pb-1">View all {formatCount(comments)} comments</p>
              )}

              {/* Bottom nav */}
              <div className="mt-auto h-[50px] bg-black flex items-center justify-around px-5 pt-0.5 pb-[6px] border-t border-white/5">
                {["Home", "Search", "＋", "Reels", "Profile"].map((label, i) => (
                  <div key={i} className="flex flex-col items-center">
                    {i === 2 ? (
                      <div className="h-[26px] w-[26px] rounded-lg border-2 border-white/80 flex items-center justify-center"><span className="text-white text-lg leading-none">+</span></div>
                    ) : (
                      <span className={`text-[10px] ${i === 0 ? "text-white font-bold" : "text-white/50"}`}>{label}</span>
                    )}
                  </div>
                ))}
              </div>
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
      </DialogContent>
    </Dialog>
  );
};

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, ExternalLink, Star } from "lucide-react";
import { toast } from "sonner";
import type { ProfileData } from "./types";

const copyField = (label: string, value: string) => {
  navigator.clipboard.writeText(value);
  toast.success(`${label} copied`);
};

const stripHtml = (html: string) => html?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "";
const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "long", year: "numeric" });

export default function ProfileHeader({ profile }: { profile: ProfileData }) {
  return (
    <div className="space-y-4">
      {profile.header && (
        <div className="relative rounded-xl overflow-hidden h-40">
          <img src={profile.header} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(220,60%,10%)] via-transparent to-transparent" />
        </div>
      )}

      <Card className="bg-white/[0.04] border-white/[0.08] -mt-16 relative z-10 mx-4">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="shrink-0 -mt-12">
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.name} className="w-20 h-20 rounded-xl object-cover border-4 border-[hsl(220,60%,10%)]" />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-accent/20 flex items-center justify-center text-white text-2xl font-bold border-4 border-[hsl(220,60%,10%)]">
                  {profile.name?.charAt(0) || "?"}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white">{profile.name}</h2>
                {profile.isVerified && (
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">
                    <Star className="h-3 w-3 mr-1" /> Verified
                  </Badge>
                )}
                {profile.isActive && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">Active</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-white/40">@{profile.username}</span>
                <button onClick={() => copyField("Username", profile.username)}>
                  <Copy className="h-3 w-3 text-white/20 hover:text-white/50" />
                </button>
                {profile.ofapi_gender && (
                  <span className="text-[10px] text-white/25 capitalize">
                    {profile.ofapi_gender} ({Math.round(profile.ofapi_gender_confidence * 100)}%)
                  </span>
                )}
              </div>
            </div>

            <a href={`https://onlyfans.com/${profile.username}`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost" className="text-white/40 hover:text-white gap-1.5 text-xs">
                <ExternalLink className="h-3.5 w-3.5" /> View
              </Button>
            </a>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 mt-4 pt-3 border-t border-white/[0.05]">
            <Button size="sm" variant="ghost" onClick={() => copyField("Profile URL", `https://onlyfans.com/${profile.username}`)} className="text-white/40 hover:text-white hover:bg-white/10 text-xs gap-1.5">
              <Copy className="h-3 w-3" /> Copy URL
            </Button>
            <Button size="sm" variant="ghost" onClick={() => copyField("Bio", stripHtml(profile.about))} className="text-white/40 hover:text-white hover:bg-white/10 text-xs gap-1.5">
              <Copy className="h-3 w-3" /> Copy Bio
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const text = `${profile.name} (@${profile.username})\nPrice: ${profile.subscribePrice === 0 ? "Free" : `$${profile.subscribePrice}`}\nMedia: ${profile.mediasCount} | Posts: ${profile.postsCount}\nFavorited: ${profile.favoritedCount.toLocaleString()}\nJoined: ${formatDate(profile.joinDate)}`;
                copyField("Summary", text);
              }}
              className="text-white/40 hover:text-white hover:bg-white/10 text-xs gap-1.5"
            >
              <Copy className="h-3 w-3" /> Copy Summary
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

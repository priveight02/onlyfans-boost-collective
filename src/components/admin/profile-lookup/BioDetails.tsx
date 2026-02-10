import { Button } from "@/components/ui/button";
import { Copy, Calendar, Globe, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { ProfileData } from "./types";

const copyField = (label: string, value: string) => {
  navigator.clipboard.writeText(value);
  toast.success(`${label} copied`);
};
const stripHtml = (html: string) => html?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "";
const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "long", year: "numeric" });

export default function BioDetails({ profile }: { profile: ProfileData }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.05]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">Bio</h3>
          <Button size="sm" variant="ghost" onClick={() => copyField("Bio", stripHtml(profile.about))} className="text-white/30 hover:text-white h-6 text-xs gap-1">
            <Copy className="h-3 w-3" /> Copy
          </Button>
        </div>
        <p className="text-sm text-white/50 leading-relaxed line-clamp-6">{stripHtml(profile.about)}</p>
      </div>

      <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.05] space-y-3">
        <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">Details</h3>
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-white/25" />
            <span className="text-xs text-white/40">Joined:</span>
            <span className="text-sm text-white/60">{formatDate(profile.joinDate)}</span>
          </div>
          {profile.location && (
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-white/25" />
              <span className="text-sm text-white/60">{profile.location}</span>
            </div>
          )}
          {profile.website && (
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-white/25" />
              <a href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-accent/70 hover:text-accent truncate">
                {profile.website}
              </a>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Video className="h-3.5 w-3.5 text-white/25" />
            <span className="text-xs text-white/40">Streams:</span>
            <span className="text-sm text-white/60">{profile.finishedStreamsCount}</span>
          </div>
          <div className="flex gap-2 flex-wrap mt-1">
            {profile.hasPinnedPosts && <Badge variant="outline" className="text-[10px] text-white/30 border-white/10">Pinned Posts</Badge>}
            {profile.hasStories && <Badge variant="outline" className="text-[10px] text-white/30 border-white/10">Stories</Badge>}
            {profile.tipsEnabled && <Badge variant="outline" className="text-[10px] text-white/30 border-white/10">Tips: ${profile.tipsMin}-${profile.tipsMax}</Badge>}
          </div>
        </div>
      </div>
    </div>
  );
}

import {
  TrendingUp, Heart, Image, Video, FileText, Users, Calendar, Globe, Radio, Pin, MessageCircle
} from "lucide-react";
import type { ProfileData, EngagementMetrics } from "./types";

const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "long", year: "numeric" });

const StatCard = ({ icon: Icon, label, value, color, sub }: { icon: any; label: string; value: string; color: string; sub?: string }) => (
  <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05] text-center">
    <Icon className={`h-4 w-4 ${color} mx-auto mb-1.5`} />
    <p className="text-lg font-bold text-white">{value}</p>
    <p className="text-[10px] text-white/30">{label}</p>
    {sub && <p className="text-[9px] text-white/20 mt-0.5">{sub}</p>}
  </div>
);

export default function StatsOverview({ profile, metrics }: { profile: ProfileData; metrics: EngagementMetrics }) {
  return (
    <div className="space-y-4">
      {/* Primary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard icon={TrendingUp} label="Price" value={profile.subscribePrice === 0 ? "Free" : `$${profile.subscribePrice}`} color="text-emerald-400" />
        <StatCard icon={Heart} label="Favorited" value={(profile.favoritedCount || 0).toLocaleString()} color="text-pink-400" />
        <StatCard icon={Image} label="Photos" value={profile.photosCount.toLocaleString()} color="text-blue-400" />
        <StatCard icon={Video} label="Videos" value={profile.videosCount.toLocaleString()} color="text-amber-400" />
        <StatCard icon={FileText} label="Posts" value={profile.postsCount.toLocaleString()} color="text-cyan-400" sub={`${metrics.avgPostsPerMonth}/mo`} />
        <StatCard icon={Image} label="Total Media" value={profile.mediasCount.toLocaleString()} color="text-violet-400" sub={`${metrics.avgMediaPerPost} per post`} />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard icon={Users} label="Est. Subscribers" value={(profile.subscribersCount ?? Math.round(profile.favoritedCount * 0.15)).toLocaleString()} color="text-teal-400" />
        <StatCard icon={Radio} label="Streams" value={profile.finishedStreamsCount.toString()} color="text-purple-400" />
        <StatCard icon={Calendar} label="Account Age" value={`${metrics.accountAge} mo`} color="text-orange-400" sub={`Since ${formatDate(profile.joinDate)}`} />
        <StatCard icon={Pin} label="Pinned Posts" value={profile.hasPinnedPosts ? "Yes" : "No"} color="text-rose-400" />
        <StatCard icon={MessageCircle} label="Tips" value={profile.tipsEnabled ? `$${profile.tipsMin}-$${profile.tipsMax}` : "Off"} color="text-yellow-400" />
        <StatCard icon={Globe} label="Location" value={profile.location || "N/A"} color="text-sky-400" />
      </div>
    </div>
  );
}

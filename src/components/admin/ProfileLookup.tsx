import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search, Loader2, Users, FileText, Image, Video, Heart,
  Calendar, Globe, Copy, TrendingUp, Star, ExternalLink,
} from "lucide-react";

interface ProfileData {
  name: string;
  username: string;
  about: string;
  avatar: string;
  header: string;
  subscribersCount: number | null;
  subscribePrice: number;
  mediasCount: number;
  photosCount: number;
  videosCount: number;
  postsCount: number;
  favoritedCount: number;
  isVerified: boolean;
  joinDate: string;
  location: string;
  website: string;
  isActive: boolean;
  tipsEnabled: boolean;
  tipsMin: number;
  tipsMax: number;
  finishedStreamsCount: number;
  hasPinnedPosts: boolean;
  hasStories: boolean;
  ofapi_gender: string;
  ofapi_gender_confidence: number;
}

const ProfileLookup = () => {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const lookupProfile = async () => {
    const clean = username.trim().replace("@", "");
    if (!clean) return;

    setLoading(true);
    setProfile(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onlyfans-api`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ endpoint: `/profiles/${clean}` }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to fetch profile");
        return;
      }

      if (result.data) {
        setProfile(result.data);
      } else {
        toast.error("Profile not found");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const copyField = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const stripHtml = (html: string) => html?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "";

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input
            placeholder="Enter OnlyFans username (e.g. madison420ivy)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookupProfile()}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-accent"
          />
        </div>
        <Button onClick={lookupProfile} disabled={loading || !username.trim()} className="bg-accent hover:bg-accent/80 text-white gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Lookup
        </Button>
      </div>

      {/* Profile result */}
      {profile && (
        <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          {/* Hero header */}
          {profile.header && (
            <div className="relative rounded-xl overflow-hidden h-40">
              <img src={profile.header} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(220,60%,10%)] via-transparent to-transparent" />
            </div>
          )}

          {/* Profile card */}
          <Card className="bg-white/[0.04] border-white/[0.08] -mt-16 relative z-10 mx-4">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                {/* Avatar */}
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
                      <span className="text-[10px] text-white/25 capitalize">{profile.ofapi_gender} ({Math.round(profile.ofapi_gender_confidence * 100)}%)</span>
                    )}
                  </div>
                </div>

                <a href={`https://onlyfans.com/${profile.username}`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="ghost" className="text-white/40 hover:text-white gap-1.5 text-xs">
                    <ExternalLink className="h-3.5 w-3.5" /> View
                  </Button>
                </a>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-5">
                {[
                  { label: "Price", value: profile.subscribePrice === 0 ? "Free" : `$${profile.subscribePrice}`, icon: TrendingUp, color: "text-emerald-400" },
                  { label: "Favorited", value: (profile.favoritedCount || 0).toLocaleString(), icon: Heart, color: "text-pink-400" },
                  { label: "Media", value: profile.mediasCount.toLocaleString(), icon: Image, color: "text-violet-400" },
                  { label: "Photos", value: profile.photosCount.toLocaleString(), icon: Image, color: "text-blue-400" },
                  { label: "Videos", value: profile.videosCount.toLocaleString(), icon: Video, color: "text-amber-400" },
                  { label: "Posts", value: profile.postsCount.toLocaleString(), icon: FileText, color: "text-cyan-400" },
                ].map((s) => (
                  <div key={s.label} className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05] text-center">
                    <s.icon className={`h-4 w-4 ${s.color} mx-auto mb-1.5`} />
                    <p className="text-lg font-bold text-white">{s.value}</p>
                    <p className="text-[10px] text-white/30">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Additional info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {/* Bio */}
                <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.05]">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">Bio</h3>
                    <Button size="sm" variant="ghost" onClick={() => copyField("Bio", stripHtml(profile.about))} className="text-white/30 hover:text-white h-6 text-xs gap-1">
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                  <p className="text-sm text-white/50 leading-relaxed line-clamp-6">{stripHtml(profile.about)}</p>
                </div>

                {/* Details */}
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
                      {profile.tipsEnabled && <Badge variant="outline" className="text-[10px] text-white/30 border-white/10">Tips: ${profile.tipsMin}-${profile.tipsMax}</Badge>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex gap-2 mt-4 pt-4 border-t border-white/[0.05]">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyField("Profile URL", `https://onlyfans.com/${profile.username}`)}
                  className="text-white/40 hover:text-white hover:bg-white/10 text-xs gap-1.5"
                >
                  <Copy className="h-3 w-3" /> Copy URL
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const text = `${profile.name} (@${profile.username})\nPrice: ${profile.subscribePrice === 0 ? "Free" : `$${profile.subscribePrice}`}\nMedia: ${profile.mediasCount} | Posts: ${profile.postsCount}\nFavorited: ${profile.favoritedCount.toLocaleString()}\nJoined: ${formatDate(profile.joinDate)}`;
                    copyField("Profile Summary", text);
                  }}
                  className="text-white/40 hover:text-white hover:bg-white/10 text-xs gap-1.5"
                >
                  <Copy className="h-3 w-3" /> Copy Summary
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {!profile && !loading && (
        <div className="text-center py-16 text-white/20">
          <Search className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Search for a creator profile to view their analytics</p>
          <p className="text-xs mt-1 text-white/15">Enter any OnlyFans username to get started</p>
        </div>
      )}
    </div>
  );
};

export default ProfileLookup;

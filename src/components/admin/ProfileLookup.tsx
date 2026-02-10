import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Search, Loader2, BarChart3, TrendingUp, Layers, Radar, FileText } from "lucide-react";
import type { ProfileData } from "./profile-lookup/types";
import { computeEstimatedEarnings, computeEngagementMetrics, computeTrafficInsights } from "./profile-lookup/analytics-engine";
import ProfileHeader from "./profile-lookup/ProfileHeader";
import StatsOverview from "./profile-lookup/StatsOverview";
import EarningsAnalytics from "./profile-lookup/EarningsAnalytics";
import PerformanceScores from "./profile-lookup/PerformanceScores";
import ContentAnalytics from "./profile-lookup/ContentAnalytics";
import TrafficInsights from "./profile-lookup/TrafficInsights";
import BioDetails from "./profile-lookup/BioDetails";

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
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const earnings = profile ? computeEstimatedEarnings(profile) : null;
  const metrics = profile ? computeEngagementMetrics(profile) : null;
  const insights = profile && metrics ? computeTrafficInsights(profile, metrics) : null;

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
      {profile && earnings && metrics && insights && (
        <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          <ProfileHeader profile={profile} />

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl flex-wrap">
              <TabsTrigger value="overview" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
                <Layers className="h-3.5 w-3.5" /> Overview
              </TabsTrigger>
              <TabsTrigger value="earnings" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
                <TrendingUp className="h-3.5 w-3.5" /> Earnings
              </TabsTrigger>
              <TabsTrigger value="content" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
                <BarChart3 className="h-3.5 w-3.5" /> Content
              </TabsTrigger>
              <TabsTrigger value="traffic" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
                <Radar className="h-3.5 w-3.5" /> Traffic & Growth
              </TabsTrigger>
              <TabsTrigger value="bio" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 rounded-lg gap-1.5 text-xs">
                <FileText className="h-3.5 w-3.5" /> Bio & Details
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <StatsOverview profile={profile} metrics={metrics} />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <EarningsAnalytics profile={profile} earnings={earnings} />
                </div>
                <PerformanceScores metrics={metrics} />
              </div>
            </TabsContent>

            <TabsContent value="earnings" className="space-y-4">
              <EarningsAnalytics profile={profile} earnings={earnings} />
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              <StatsOverview profile={profile} metrics={metrics} />
              <ContentAnalytics profile={profile} metrics={metrics} />
            </TabsContent>

            <TabsContent value="traffic" className="space-y-4">
              <TrafficInsights insights={insights} />
              <PerformanceScores metrics={metrics} />
            </TabsContent>

            <TabsContent value="bio" className="space-y-4">
              <BioDetails profile={profile} />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Empty state */}
      {!profile && !loading && (
        <div className="text-center py-16 text-white/20">
          <Search className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Search for a creator profile to view their full analytics</p>
          <p className="text-xs mt-1 text-white/15">Earnings estimates • Performance scores • Content analytics • Traffic insights</p>
        </div>
      )}
    </div>
  );
};

export default ProfileLookup;

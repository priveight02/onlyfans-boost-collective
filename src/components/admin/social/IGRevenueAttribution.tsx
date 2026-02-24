import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Video, Image, MessageSquare, TrendingUp } from "lucide-react";

interface Props { selectedAccount: string; }

const ATTRIBUTIONS = [
  { content: "Scaling secrets reel", type: "Video", platform: "TikTok", revenue: "$12,430", bookings: 23, icon: Video, color: "text-cyan-400" },
  { content: "Free resource carousel", type: "Post", platform: "Instagram", revenue: "$8,210", bookings: 15, icon: Image, color: "text-pink-400" },
  { content: "DM funnel campaign", type: "DM", platform: "Instagram", revenue: "$5,890", bookings: 11, icon: MessageSquare, color: "text-primary" },
  { content: "Client testimonial story", type: "Story", platform: "Instagram", revenue: "$3,100", bookings: 6, icon: Video, color: "text-amber-400" },
];

const IGRevenueAttribution = ({ selectedAccount }: Props) => {
  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-semibold text-foreground">Content → Revenue Attribution</span>
          <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400">Revenue Tracker</Badge>
        </div>
      </div>

      <Card className="bg-gradient-to-r from-emerald-500/10 to-transparent border-emerald-500/20 p-3 rounded-xl">
        <p className="text-[10px] text-muted-foreground mb-1">Total Revenue Attributed</p>
        <p className="text-2xl font-bold text-foreground">$29,630</p>
        <div className="flex items-center gap-1 mt-1">
          <TrendingUp className="h-3 w-3 text-emerald-400" />
          <span className="text-[10px] text-emerald-400">+24% vs last month</span>
        </div>
      </Card>

      <div className="space-y-2">
        {ATTRIBUTIONS.map(a => (
          <Card key={a.content} className="bg-white/[0.03] border-white/[0.06] p-3 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center ${a.color}`}>
                <a.icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-foreground">{a.content}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-[8px] border-white/10">{a.type}</Badge>
                  <Badge variant="outline" className="text-[8px] border-white/10">{a.platform}</Badge>
                  <span className="text-[9px] text-muted-foreground">{a.bookings} bookings</span>
                </div>
              </div>
              <p className="text-sm font-bold text-emerald-400">{a.revenue}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default IGRevenueAttribution;

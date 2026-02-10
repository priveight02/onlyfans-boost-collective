import { useState } from "react";
import { Copy, ExternalLink, MoreHorizontal, TrendingUp, Users, FileText, Mail, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Account {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  platform: string;
  status: string;
  tier: string | null;
  monthly_revenue: number;
  total_revenue: number;
  subscriber_count: number;
  engagement_rate: number;
  content_count: number;
  contact_email: string | null;
  tags: string[];
  last_activity_at: string | null;
  created_at: string;
}

interface CRMAccountCardProps {
  account: Account;
  onSelect: (account: Account) => void;
  onEdit: (account: Account) => void;
  onDelete: (id: string) => void;
  onConnect?: (account: Account) => void;
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  paused: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  inactive: "bg-red-500/15 text-red-400 border-red-500/20",
  onboarding: "bg-blue-500/15 text-blue-400 border-blue-500/20",
};

const tierColors: Record<string, string> = {
  standard: "bg-white/5 text-white/50 border-white/10",
  premium: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  vip: "bg-amber-500/15 text-amber-300 border-amber-400/20",
  enterprise: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
};

const CRMAccountCard = ({ account, onSelect, onEdit, onDelete, onConnect }: CRMAccountCardProps) => {
  const copyBio = () => {
    if (account.bio) {
      navigator.clipboard.writeText(account.bio);
      toast.success("Bio copied to clipboard");
    }
  };

  const copyUsername = () => {
    navigator.clipboard.writeText(account.username);
    toast.success("Username copied");
  };

  const formatRevenue = (val: number) =>
    val >= 1000 ? `$${(val / 1000).toFixed(1)}k` : `$${val.toFixed(0)}`;

  return (
    <div
      className="group relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] rounded-xl p-4 transition-all duration-200 cursor-pointer"
      onClick={() => onSelect(account)}
    >
      <div className="flex items-start gap-3.5">
        {/* Avatar */}
        <div className="relative shrink-0">
          {account.avatar_url ? (
            <img
              src={account.avatar_url}
              alt={account.display_name || account.username}
              className="w-11 h-11 rounded-lg object-cover"
            />
          ) : (
            <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-accent/30 to-primary/30 flex items-center justify-center text-white font-semibold text-sm">
              {(account.display_name || account.username).charAt(0).toUpperCase()}
            </div>
          )}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[hsl(220,60%,10%)] ${
            account.status === "active" ? "bg-emerald-400" : account.status === "paused" ? "bg-amber-400" : "bg-white/20"
          }`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-semibold text-white truncate">
              {account.display_name || account.username}
            </h3>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${statusColors[account.status] || ""}`}>
              {account.status}
            </Badge>
            {account.tier && account.tier !== "standard" && (
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${tierColors[account.tier] || ""}`}>
                {account.tier}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-white/40">@{account.username}</span>
            {(account as any).of_connected && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">OF</span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); copyUsername(); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Copy className="h-3 w-3 text-white/30 hover:text-white/60" />
            </button>
          </div>
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/30 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[hsl(220,60%,13%)] border-white/10 text-white">
            <DropdownMenuItem onClick={() => onEdit(account)} className="hover:bg-white/10 cursor-pointer">
              Edit Account
            </DropdownMenuItem>
            <DropdownMenuItem onClick={copyBio} disabled={!account.bio} className="hover:bg-white/10 cursor-pointer">
              <Copy className="h-3.5 w-3.5 mr-2" /> Copy Bio
            </DropdownMenuItem>
            {onConnect && (
              <DropdownMenuItem onClick={() => onConnect(account)} className="hover:bg-white/10 cursor-pointer">
                <Link2 className="h-3.5 w-3.5 mr-2" /> {(account as any).of_connected ? "Manage OF" : "Connect OF"}
              </DropdownMenuItem>
            )}
            {account.contact_email && (
              <DropdownMenuItem className="hover:bg-white/10 cursor-pointer">
                <Mail className="h-3.5 w-3.5 mr-2" /> Email
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onDelete(account.id)} className="text-red-400 hover:bg-red-500/10 cursor-pointer">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bio preview */}
      {account.bio && (
        <p className="text-xs text-white/35 mt-2.5 line-clamp-2 leading-relaxed">{account.bio}</p>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.05]">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3 w-3 text-emerald-400/70" />
          <span className="text-xs font-medium text-white/60">{formatRevenue(account.monthly_revenue)}/mo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="h-3 w-3 text-accent/70" />
          <span className="text-xs font-medium text-white/60">{account.subscriber_count.toLocaleString()} subs</span>
        </div>
        <div className="flex items-center gap-1.5">
          <FileText className="h-3 w-3 text-violet-400/70" />
          <span className="text-xs font-medium text-white/60">{account.content_count} posts</span>
        </div>
        {account.engagement_rate > 0 && (
          <span className="text-[10px] text-white/30 ml-auto">{account.engagement_rate}% eng.</span>
        )}
      </div>

      {/* Tags */}
      {account.tags && account.tags.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {account.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/30">
              {tag}
            </span>
          ))}
          {account.tags.length > 3 && (
            <span className="text-[10px] text-white/20">+{account.tags.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default CRMAccountCard;

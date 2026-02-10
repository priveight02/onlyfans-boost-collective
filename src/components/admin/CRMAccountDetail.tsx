import { Copy, X, Mail, Globe, TrendingUp, Users, FileText, Calendar, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

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
  contact_phone: string | null;
  social_links: Record<string, string>;
  notes: string | null;
  tags: string[];
  last_activity_at: string | null;
  onboarded_at: string | null;
  created_at: string;
}

interface CRMAccountDetailProps {
  account: Account;
  onClose: () => void;
  onEdit: (account: Account) => void;
}

const CRMAccountDetail = ({ account, onClose, onEdit }: CRMAccountDetailProps) => {
  const copyField = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
  const formatCurrency = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[hsl(220,60%,10%)] border border-white/10 rounded-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[hsl(220,60%,10%)] border-b border-white/5 p-5 flex items-start gap-4">
          <div className="shrink-0">
            {account.avatar_url ? (
              <img src={account.avatar_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent/30 to-primary/30 flex items-center justify-center text-white font-bold text-lg">
                {(account.display_name || account.username).charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white">{account.display_name || account.username}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-white/40">@{account.username}</span>
              <button onClick={() => copyField("Username", account.username)}>
                <Copy className="h-3 w-3 text-white/20 hover:text-white/50" />
              </button>
              <Badge variant="outline" className="text-[10px] ml-1">{account.status}</Badge>
              {account.tier && <Badge variant="outline" className="text-[10px]">{account.tier}</Badge>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => onEdit(account)} className="text-white/50 hover:text-white hover:bg-white/10 text-xs">
              Edit
            </Button>
            <Button size="icon" variant="ghost" onClick={onClose} className="text-white/30 hover:text-white hover:bg-white/10 h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Revenue stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Monthly Rev", value: formatCurrency(account.monthly_revenue), icon: TrendingUp, color: "text-emerald-400" },
              { label: "Total Rev", value: formatCurrency(account.total_revenue), icon: TrendingUp, color: "text-accent" },
              { label: "Subscribers", value: account.subscriber_count.toLocaleString(), icon: Users, color: "text-violet-400" },
              { label: "Engagement", value: `${account.engagement_rate}%`, icon: FileText, color: "text-amber-400" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
                <stat.icon className={`h-3.5 w-3.5 ${stat.color} mb-1.5`} />
                <p className="text-base font-bold text-white">{stat.value}</p>
                <p className="text-[10px] text-white/30 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Bio */}
          {account.bio && (
            <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.05]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">Bio</h3>
                <Button size="sm" variant="ghost" onClick={() => copyField("Bio", account.bio!)} className="text-white/30 hover:text-white h-6 text-xs gap-1">
                  <Copy className="h-3 w-3" /> Copy
                </Button>
              </div>
              <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">{account.bio}</p>
            </div>
          )}

          {/* Contact & details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.05] space-y-3">
              <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">Contact</h3>
              {account.contact_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-white/25" />
                  <span className="text-sm text-white/60 flex-1 truncate">{account.contact_email}</span>
                  <button onClick={() => copyField("Email", account.contact_email!)}>
                    <Copy className="h-3 w-3 text-white/20 hover:text-white/50" />
                  </button>
                </div>
              )}
              {account.contact_phone && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/60">{account.contact_phone}</span>
                  <button onClick={() => copyField("Phone", account.contact_phone!)}>
                    <Copy className="h-3 w-3 text-white/20 hover:text-white/50" />
                  </button>
                </div>
              )}
              {!account.contact_email && !account.contact_phone && (
                <p className="text-xs text-white/20">No contact info</p>
              )}
            </div>
            <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.05] space-y-3">
              <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">Timeline</h3>
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-white/25" />
                <span className="text-xs text-white/40">Added:</span>
                <span className="text-sm text-white/60">{formatDate(account.created_at)}</span>
              </div>
              {account.onboarded_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-white/25" />
                  <span className="text-xs text-white/40">Onboarded:</span>
                  <span className="text-sm text-white/60">{formatDate(account.onboarded_at)}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-white/25" />
                <span className="text-xs text-white/40">Last active:</span>
                <span className="text-sm text-white/60">{formatDate(account.last_activity_at)}</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          {account.tags && account.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="h-3.5 w-3.5 text-white/20" />
              {account.tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/[0.05]">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Notes */}
          {account.notes && (
            <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.05]">
              <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Internal Notes</h3>
              <p className="text-sm text-white/50 whitespace-pre-wrap">{account.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CRMAccountDetail;

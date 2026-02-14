import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Send, Search, Loader2, Users, Bot, Sparkles, CheckCheck,
  RefreshCw, UserPlus, MessageCircle, Zap, User,
} from "lucide-react";

interface BulkMessageHubProps {
  accountId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Follower {
  id: string;
  name: string;
  username: string;
  profile_pic: string | null;
  source: string;
}

const BulkMessageHub = ({ accountId, open, onOpenChange }: BulkMessageHubProps) => {
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<{ sent: number; total: number } | null>(null);
  const [autoChat, setAutoChat] = useState(true);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followsCount, setFollowsCount] = useState(0);
  const [sendResults, setSendResults] = useState<any[] | null>(null);

  const fetchFollowers = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("instagram-api", {
        body: { action: "get_followers_list", account_id: accountId, params: { limit: 200 } },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to fetch followers");

      const f = data.data?.followers || [];
      setFollowers(f);
      setFollowersCount(data.data?.followers_count || 0);
      setFollowsCount(data.data?.follows_count || 0);
    } catch (e: any) {
      toast.error(e.message || "Failed to load followers");
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    if (open && followers.length === 0) fetchFollowers();
  }, [open, fetchFollowers]);

  const filteredFollowers = followers.filter(f =>
    !searchQuery ||
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredFollowers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFollowers.map(f => f.id)));
    }
  };

  const generateAIMessage = async () => {
    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-ai-responder", {
        body: { action: "generate_opener", account_id: accountId, params: {} },
      });
      if (error) throw error;
      if (data?.data?.message) {
        setMessage(data.data.message);
        toast.success("AI message generated");
      } else {
        // Fallback opener
        setMessage("hey babe 💕 just wanted to say hi, ive been posting some exclusive stuff lately and thought u might wanna check it out 😘");
        toast.success("Default opener loaded");
      }
    } catch {
      setMessage("hey babe 💕 just wanted to say hi, ive been posting some exclusive stuff lately and thought u might wanna check it out 😘");
      toast.success("Default opener loaded");
    } finally {
      setGeneratingAI(false);
    }
  };

  const sendBulkMessages = async (recipients: Follower[]) => {
    if (!message.trim() || recipients.length === 0) {
      toast.error("Select recipients and enter a message");
      return;
    }
    setSending(true);
    setSendProgress({ sent: 0, total: recipients.length });
    setSendResults(null);

    try {
      const { data, error } = await supabase.functions.invoke("instagram-api", {
        body: {
          action: "send_bulk_messages",
          account_id: accountId,
          params: {
            recipients: recipients.map(r => ({ id: r.id, name: r.name })),
            message: message.trim(),
          },
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Bulk send failed");

      const result = data.data;
      setSendResults(result.details || []);
      setSendProgress({ sent: result.sent, total: result.total });
      toast.success(`Sent ${result.sent}/${result.total} messages`);

      // If auto-chat enabled, create conversations and enable AI on them
      if (autoChat && result.details) {
        for (const r of result.details) {
          if (!r.success) continue;
          // Check if conversation already exists
          const { data: existing } = await supabase
            .from("ai_dm_conversations")
            .select("id")
            .eq("account_id", accountId)
            .eq("participant_id", r.id)
            .limit(1);

          if (existing && existing.length > 0) {
            // Enable AI on existing
            await supabase.from("ai_dm_conversations").update({
              ai_enabled: true,
              is_read: false,
              last_message_at: new Date().toISOString(),
            }).eq("id", existing[0].id);
          } else {
            // Create new conversation with AI enabled
            const recipient = recipients.find(rec => rec.id === r.id);
            await supabase.from("ai_dm_conversations").insert({
              account_id: accountId,
              participant_id: r.id,
              participant_name: recipient?.name || r.name,
              participant_username: recipient?.username || r.name,
              participant_avatar_url: recipient?.profile_pic || null,
              platform: "instagram",
              ai_enabled: true,
              status: "active",
              folder: "primary",
              is_read: false,
              last_message_at: new Date().toISOString(),
              last_message_preview: `You: ${message.substring(0, 80)}`,
            });
          }
        }
        toast.success("AI auto-chat enabled on all sent conversations");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to send messages");
    } finally {
      setSending(false);
    }
  };

  const selectedFollowers = followers.filter(f => selectedIds.has(f.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 bg-background">
        <DialogHeader className="px-5 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4 text-accent" />
            Bulk Message Hub
            <Badge variant="outline" className="text-[9px] ml-2 text-muted-foreground">
              {followersCount} followers · {followsCount} following
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Message Composer */}
          <div className="px-5 py-3 border-b border-border space-y-2">
            <div className="flex items-center gap-2">
              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Type your message... or generate with AI"
                className="min-h-[60px] max-h-[100px] text-sm bg-muted/30 border-border/50 resize-none"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={generateAIMessage} disabled={generatingAI} className="h-7 text-[10px] gap-1.5 border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
                {generatingAI ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                AI Generate Opener
              </Button>
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[10px] text-muted-foreground">Auto-chat after send</span>
                <Switch checked={autoChat} onCheckedChange={setAutoChat} className="scale-75" />
                <Bot className={`h-3.5 w-3.5 ${autoChat ? "text-blue-400" : "text-muted-foreground/40"}`} />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-5 py-2.5 border-b border-border/50 flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="default"
              disabled={selectedIds.size === 0 || !message.trim() || sending}
              onClick={() => sendBulkMessages(selectedFollowers)}
              className="h-8 text-xs gap-1.5"
            >
              {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              Send to Selected ({selectedIds.size})
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={followers.length === 0 || !message.trim() || sending}
              onClick={() => sendBulkMessages(followers)}
              className="h-8 text-xs gap-1.5 border-green-500/30 text-green-400 hover:bg-green-500/10"
            >
              <Users className="h-3 w-3" />
              Send to All ({followers.length})
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={fetchFollowers}
              className="h-8 text-xs gap-1.5"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Refresh List
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={selectAll}
              className="h-8 text-xs gap-1.5 ml-auto"
            >
              <CheckCheck className="h-3 w-3" />
              {selectedIds.size === filteredFollowers.length ? "Deselect All" : "Select All"}
            </Button>
          </div>

          {/* Send Progress */}
          {sendProgress && (
            <div className="px-5 py-2 border-b border-border/50 bg-muted/10">
              <div className="flex items-center gap-2 text-xs">
                {sending ? <Loader2 className="h-3 w-3 animate-spin text-blue-400" /> : <CheckCheck className="h-3 w-3 text-green-400" />}
                <span className={sending ? "text-blue-400" : "text-green-400"}>
                  {sending ? `Sending... ${sendProgress.sent}/${sendProgress.total}` : `Done: ${sendProgress.sent}/${sendProgress.total} sent`}
                </span>
              </div>
              <div className="mt-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500/70 rounded-full transition-all duration-500"
                  style={{ width: `${sendProgress.total > 0 ? Math.round((sendProgress.sent / sendProgress.total) * 100) : 0}%` }}
                />
              </div>
              {sendResults && (
                <div className="mt-1.5 flex gap-2 text-[10px]">
                  <span className="text-green-400">{sendResults.filter(r => r.success).length} sent</span>
                  <span className="text-red-400">{sendResults.filter(r => !r.success).length} failed</span>
                </div>
              )}
            </div>
          )}

          {/* Search */}
          <div className="px-5 py-2 border-b border-border/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search followers..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-muted/20 border-0"
              />
            </div>
          </div>

          {/* Follower List */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">Loading contacts from Instagram...</p>
              </div>
            ) : filteredFollowers.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/20" />
                <p className="text-xs text-muted-foreground">
                  {followers.length === 0
                    ? "No contacts found — sync your inbox first to populate the list"
                    : "No matches found"}
                </p>
                {followers.length === 0 && (
                  <Button size="sm" variant="outline" onClick={fetchFollowers} className="mt-3 text-xs h-7">
                    <RefreshCw className="h-3 w-3 mr-1" />Fetch Contacts
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {filteredFollowers.map(f => {
                  const isSelected = selectedIds.has(f.id);
                  const sendResult = sendResults?.find(r => r.id === f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => toggleSelect(f.id)}
                      className={`w-full text-left px-5 py-2.5 flex items-center gap-3 transition-colors hover:bg-muted/20 ${isSelected ? "bg-accent/5" : ""}`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(f.id)}
                        className="flex-shrink-0"
                      />
                      {f.profile_pic ? (
                        <img src={f.profile_pic} alt="" className="h-9 w-9 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">@{f.username}</p>
                      </div>
                      {sendResult && (
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${sendResult.success ? "text-green-400 border-green-500/30" : "text-red-400 border-red-500/30"}`}
                        >
                          {sendResult.success ? "Sent ✓" : "Failed"}
                        </Badge>
                      )}
                      {isSelected && !sendResult && (
                        <div className="h-2 w-2 rounded-full bg-accent flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Footer Stats */}
          <div className="px-5 py-2.5 border-t border-border bg-muted/10 text-[10px] text-muted-foreground flex items-center justify-between">
            <span>{followers.length} contacts loaded · {selectedIds.size} selected</span>
            {autoChat && <span className="text-blue-400 flex items-center gap-1"><Bot className="h-3 w-3" />AI auto-chat ON</span>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkMessageHub;

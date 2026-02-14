import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Send, Search, Loader2, Users, Bot, Sparkles, CheckCheck,
  RefreshCw, User, XCircle, Square,
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
  const cancelRef = useRef(false);
  const messageRef = useRef(message);

  // Keep messageRef in sync for real-time editing during send
  useEffect(() => {
    messageRef.current = message;
  }, [message]);

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

  const cancelSend = () => {
    cancelRef.current = true;
    toast.info("Cancelling send... will stop after current message");
  };

  const sendBulkMessages = async (recipients: Follower[]) => {
    if (!messageRef.current.trim() || recipients.length === 0) {
      toast.error("Select recipients and enter a message");
      return;
    }
    setSending(true);
    cancelRef.current = false;
    setSendProgress({ sent: 0, total: recipients.length });
    setSendResults(null);

    const results: any[] = [];
    let sent = 0;

    for (const recipient of recipients) {
      if (cancelRef.current) {
        toast.info(`Send cancelled after ${sent}/${recipients.length}`);
        break;
      }

      try {
        // Use messageRef.current to get the LATEST edited message in real-time
        const currentMessage = messageRef.current.trim();
        if (!currentMessage) {
          results.push({ id: recipient.id, name: recipient.name, success: false, error: "Empty message" });
          continue;
        }

        const { data, error } = await supabase.functions.invoke("instagram-api", {
          body: {
            action: "send_message",
            account_id: accountId,
            params: { recipient_id: recipient.id, message: currentMessage },
          },
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "Send failed");

        results.push({ id: recipient.id, name: recipient.name, success: true });
        sent++;
      } catch (e: any) {
        results.push({ id: recipient.id, name: recipient.name, success: false, error: e.message });
      }

      setSendProgress({ sent, total: recipients.length });
      setSendResults([...results]);
    }

    setSendResults(results);
    setSendProgress({ sent, total: recipients.length });

    if (!cancelRef.current) {
      toast.success(`Sent ${sent}/${recipients.length} messages`);
    }

    // If auto-chat enabled, create conversations and enable AI on them
    if (autoChat) {
      for (const r of results) {
        if (!r.success) continue;
        const { data: existing } = await supabase
          .from("ai_dm_conversations")
          .select("id")
          .eq("account_id", accountId)
          .eq("participant_id", r.id)
          .limit(1);

        const recipient = recipients.find(rec => rec.id === r.id);
        if (existing && existing.length > 0) {
          await supabase.from("ai_dm_conversations").update({
            ai_enabled: true,
            is_read: false,
            last_message_at: new Date().toISOString(),
          }).eq("id", existing[0].id);
        } else {
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
            last_message_preview: `You: ${messageRef.current.substring(0, 80)}`,
          });
        }
      }
      toast.success("AI auto-chat enabled on all sent conversations");
    }

    setSending(false);
  };

  const selectedFollowers = followers.filter(f => selectedIds.has(f.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 bg-[hsl(222,35%,8%)] border-white/10 text-white">
        <DialogHeader className="px-5 py-4 border-b border-white/10">
          <DialogTitle className="flex items-center gap-2 text-base text-white">
            <Send className="h-4 w-4 text-accent" />
            Bulk Message Hub
            <Badge variant="outline" className="text-[9px] ml-2 text-white/50 border-white/20">
              {followersCount} followers · {followsCount} following
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Message Composer */}
          <div className="px-5 py-3 border-b border-white/10 space-y-2">
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type your message... or generate with AI"
              className="min-h-[60px] max-h-[100px] text-sm bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none focus:border-accent"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={generateAIMessage} disabled={generatingAI} className="h-7 text-[10px] gap-1.5 border-purple-500/30 text-purple-400 hover:bg-purple-500/10 bg-transparent">
                {generatingAI ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                AI Generate Opener
              </Button>
              {sending && (
                <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30 animate-pulse">
                  ✏️ Edit message above — changes apply in real-time
                </Badge>
              )}
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[10px] text-white/50">Auto-chat after send</span>
                <Switch checked={autoChat} onCheckedChange={setAutoChat} className="scale-75" />
                <Bot className={`h-3.5 w-3.5 ${autoChat ? "text-blue-400" : "text-white/20"}`} />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-5 py-2.5 border-b border-white/10 flex items-center gap-2 flex-wrap">
            {sending ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={cancelSend}
                className="h-8 text-xs gap-1.5"
              >
                <XCircle className="h-3 w-3" />
                Cancel Send
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="default"
                  disabled={selectedIds.size === 0 || !message.trim()}
                  onClick={() => sendBulkMessages(selectedFollowers)}
                  className="h-8 text-xs gap-1.5"
                >
                  <Send className="h-3 w-3" />
                  Send to Selected ({selectedIds.size})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={followers.length === 0 || !message.trim()}
                  onClick={() => sendBulkMessages(followers)}
                  className="h-8 text-xs gap-1.5 border-green-500/30 text-green-400 hover:bg-green-500/10 bg-transparent"
                >
                  <Users className="h-3 w-3" />
                  Send to All ({followers.length})
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={fetchFollowers}
              className="h-8 text-xs gap-1.5 bg-transparent border-white/10 text-white/70 hover:bg-white/5"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={selectAll}
              className="h-8 text-xs gap-1.5 ml-auto text-white/60 hover:text-white hover:bg-white/5"
            >
              {selectedIds.size === filteredFollowers.length && filteredFollowers.length > 0 ? (
                <><Square className="h-3 w-3" /> Deselect All</>
              ) : (
                <><CheckCheck className="h-3 w-3" /> Select All ({filteredFollowers.length})</>
              )}
            </Button>
          </div>

          {/* Send Progress */}
          {sendProgress && (
            <div className="px-5 py-2 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2 text-xs">
                {sending ? <Loader2 className="h-3 w-3 animate-spin text-blue-400" /> : <CheckCheck className="h-3 w-3 text-green-400" />}
                <span className={sending ? "text-blue-400" : "text-green-400"}>
                  {sending ? `Sending... ${sendProgress.sent}/${sendProgress.total}` : `Done: ${sendProgress.sent}/${sendProgress.total} sent`}
                </span>
                {cancelRef.current && sending && <span className="text-amber-400 text-[10px]">Cancelling...</span>}
              </div>
              <div className="mt-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
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
          <div className="px-5 py-2 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
              <Input
                placeholder="Search followers..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-accent"
              />
            </div>
          </div>

          {/* Follower List — scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-white/20" />
                <p className="text-xs text-white/40">Loading contacts from Instagram...</p>
              </div>
            ) : filteredFollowers.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="h-10 w-10 mx-auto mb-3 text-white/10" />
                <p className="text-xs text-white/40">
                  {followers.length === 0
                    ? "No contacts found — sync your inbox first to populate the list"
                    : "No matches found"}
                </p>
                {followers.length === 0 && (
                  <Button size="sm" variant="outline" onClick={fetchFollowers} className="mt-3 text-xs h-7 bg-transparent border-white/10 text-white/60">
                    <RefreshCw className="h-3 w-3 mr-1" />Fetch Contacts
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredFollowers.map(f => {
                  const isSelected = selectedIds.has(f.id);
                  const sendResult = sendResults?.find(r => r.id === f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => toggleSelect(f.id)}
                      className={`w-full text-left px-5 py-2.5 flex items-center gap-3 transition-colors hover:bg-white/5 cursor-pointer ${isSelected ? "bg-accent/10" : ""}`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(f.id)}
                        className="flex-shrink-0 border-white/20 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                      />
                      {f.profile_pic ? (
                        <img src={f.profile_pic} alt="" className="h-9 w-9 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{f.name}</p>
                        <p className="text-[10px] text-white/40 truncate">@{f.username}</p>
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
          </div>

          {/* Footer Stats */}
          <div className="px-5 py-2.5 border-t border-white/10 bg-white/[0.02] text-[10px] text-white/40 flex items-center justify-between flex-shrink-0">
            <span>{followers.length} contacts loaded · {selectedIds.size} selected</span>
            {autoChat && <span className="text-blue-400 flex items-center gap-1"><Bot className="h-3 w-3" />AI auto-chat ON</span>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkMessageHub;

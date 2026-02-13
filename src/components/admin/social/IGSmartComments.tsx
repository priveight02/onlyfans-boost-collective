import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  MessageSquare, Loader2, Brain, Send, Zap, Target,
  DollarSign, RefreshCw, Heart, AlertCircle, CheckCircle2,
  Search, Eye, TrendingUp, ShoppingBag, ExternalLink,
} from "lucide-react";

interface Props { selectedAccount: string; }

interface SmartComment {
  id: string;
  username: string;
  text: string;
  mediaId: string;
  signal: "buying" | "interested" | "question" | "complaint" | "spam" | "neutral";
  aiReply: string;
  sent: boolean;
  dmSent: boolean;
  revenue: number;
}

const SIGNAL_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  buying: { color: "bg-green-500/15 text-green-400", icon: DollarSign, label: "Buying Signal" },
  interested: { color: "bg-blue-500/15 text-blue-400", icon: Heart, label: "Interested" },
  question: { color: "bg-yellow-500/15 text-yellow-400", icon: Search, label: "Question" },
  complaint: { color: "bg-red-500/15 text-red-400", icon: AlertCircle, label: "Complaint" },
  spam: { color: "bg-muted text-muted-foreground", icon: AlertCircle, label: "Spam" },
  neutral: { color: "bg-muted text-muted-foreground", icon: MessageSquare, label: "Neutral" },
};

const IGSmartComments = ({ selectedAccount }: Props) => {
  const [mediaId, setMediaId] = useState("");
  const [comments, setComments] = useState<SmartComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoDmEnabled, setAutoDmEnabled] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState("");
  const [sendingReply, setSendingReply] = useState<string | null>(null);

  const callApi = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("instagram-api", {
      body: { ...body, account_id: selectedAccount },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || "API error");
    return data.data;
  };

  const scanComments = async () => {
    if (!mediaId) { toast.error("Enter a media ID or post URL"); return; }
    setScanning(true);
    try {
      const result = await callApi({ action: "get_comments", params: { media_id: mediaId, limit: 50 } });
      const rawComments = result?.data || [];

      if (rawComments.length === 0) {
        toast.info("No comments found");
        setScanning(false);
        return;
      }

      // AI classify each comment
      const { data: aiData } = await supabase.functions.invoke("agency-copilot", {
        body: {
          message: `Classify these Instagram comments by buying intent and generate contextual replies.

For each comment, detect:
- signal: "buying" (price?, link?, how much?, where can I buy), "interested" (love this, want this, need), "question" (how, what, when), "complaint" (bad, terrible, not working), "spam", "neutral"
- aiReply: A contextual, engaging reply. If buying signal, include subtle CTA. If question, answer helpfully. If complaint, be empathetic.

Comments:
${rawComments.slice(0, 30).map((c: any) => `ID:${c.id} @${c.username}: ${c.text}`).join("\n")}

Return JSON array: [{ id, signal, aiReply }]`,
          context: "comment_classification",
          account_id: selectedAccount,
        },
      });

      let classified: any[] = [];
      try {
        const text = aiData?.reply || aiData?.data?.reply || "";
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) classified = JSON.parse(jsonMatch[0]);
      } catch {}

      const smartComments: SmartComment[] = rawComments.map((c: any, i: number) => {
        const ai = classified.find((cl: any) => cl.id === c.id) || classified[i] || {};
        return {
          id: c.id,
          username: c.username || "unknown",
          text: c.text || "",
          mediaId,
          signal: ai.signal || "neutral",
          aiReply: ai.aiReply || "",
          sent: false,
          dmSent: false,
          revenue: 0,
        };
      });

      setComments(smartComments);
      const buyingCount = smartComments.filter(c => c.signal === "buying").length;
      toast.success(`Scanned ${smartComments.length} comments — ${buyingCount} buying signals detected`);
    } catch (e: any) {
      toast.error(e.message);
    }
    setScanning(false);
  };

  const sendReply = async (comment: SmartComment) => {
    setSendingReply(comment.id);
    try {
      await callApi({
        action: "reply_to_comment",
        params: {
          comment_id: comment.id,
          media_id: comment.mediaId,
          message: comment.aiReply,
          comment_text: comment.text,
          comment_author: comment.username,
        },
      });
      setComments(prev => prev.map(c => c.id === comment.id ? { ...c, sent: true } : c));
      toast.success(`Reply sent to @${comment.username}`);
    } catch (e: any) {
      toast.error(e.message);
    }
    setSendingReply(null);
  };

  const sendDmToLead = async (comment: SmartComment) => {
    try {
      const dmMessage = redirectUrl
        ? `hey ${comment.username}! saw your comment 💕 check this out: ${redirectUrl}`
        : `hey ${comment.username}! thanks for the love 💕 dm me if you want more details`;

      await callApi({
        action: "send_message",
        params: { recipient_id: comment.username, message: dmMessage },
      });
      setComments(prev => prev.map(c => c.id === comment.id ? { ...c, dmSent: true } : c));
      toast.success(`DM sent to @${comment.username}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const sendAllBuyingReplies = async () => {
    const buying = comments.filter(c => c.signal === "buying" && !c.sent);
    for (const c of buying) {
      await sendReply(c);
      await new Promise(r => setTimeout(r, 1500));
    }
    toast.success(`Sent ${buying.length} replies to buying signals`);
  };

  const dmAllBuyingSignals = async () => {
    const buying = comments.filter(c => c.signal === "buying" && !c.dmSent);
    for (const c of buying) {
      await sendDmToLead(c);
      await new Promise(r => setTimeout(r, 2000));
    }
    toast.success(`DM'd ${buying.length} hot leads`);
  };

  const stats = {
    total: comments.length,
    buying: comments.filter(c => c.signal === "buying").length,
    interested: comments.filter(c => c.signal === "interested").length,
    replied: comments.filter(c => c.sent).length,
    dmsSent: comments.filter(c => c.dmSent).length,
  };

  return (
    <div className="space-y-3 pt-3">
      <div className="flex gap-2">
        <Input value={mediaId} onChange={e => setMediaId(e.target.value)} placeholder="Media ID (from your posts)" className="text-sm" />
        <Button size="sm" onClick={scanComments} disabled={scanning}>
          {scanning ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Brain className="h-3.5 w-3.5 mr-1" />}
          Scan
        </Button>
      </div>

      <Input value={redirectUrl} onChange={e => setRedirectUrl(e.target.value)} placeholder="Redirect URL for auto-DM (e.g. OF link)" className="text-sm" />

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch checked={autoReplyEnabled} onCheckedChange={setAutoReplyEnabled} />
          <span className="text-xs text-muted-foreground">Auto-reply to buying signals</span>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={autoDmEnabled} onCheckedChange={setAutoDmEnabled} />
          <span className="text-xs text-muted-foreground">Auto-DM hot leads</span>
        </div>
      </div>

      {comments.length > 0 && (
        <>
          <div className="grid grid-cols-5 gap-2">
            <Card><CardContent className="p-2 text-center"><p className="text-lg font-bold text-foreground">{stats.total}</p><p className="text-[9px] text-muted-foreground">Total</p></CardContent></Card>
            <Card className="border-green-500/20"><CardContent className="p-2 text-center"><p className="text-lg font-bold text-green-400">{stats.buying}</p><p className="text-[9px] text-muted-foreground">Buying</p></CardContent></Card>
            <Card><CardContent className="p-2 text-center"><p className="text-lg font-bold text-blue-400">{stats.interested}</p><p className="text-[9px] text-muted-foreground">Interested</p></CardContent></Card>
            <Card><CardContent className="p-2 text-center"><p className="text-lg font-bold text-foreground">{stats.replied}</p><p className="text-[9px] text-muted-foreground">Replied</p></CardContent></Card>
            <Card><CardContent className="p-2 text-center"><p className="text-lg font-bold text-foreground">{stats.dmsSent}</p><p className="text-[9px] text-muted-foreground">DMs Sent</p></CardContent></Card>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={sendAllBuyingReplies} disabled={stats.buying === 0}>
              <Zap className="h-3.5 w-3.5 mr-1" />Reply All Buying ({stats.buying})
            </Button>
            <Button size="sm" variant="outline" onClick={dmAllBuyingSignals} disabled={stats.buying === 0}>
              <Send className="h-3.5 w-3.5 mr-1" />DM All Leads ({stats.buying})
            </Button>
          </div>

          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {comments.map(c => {
                const config = SIGNAL_CONFIG[c.signal];
                const Icon = config.icon;
                return (
                  <Card key={c.id} className={c.signal === "buying" ? "border-green-500/20" : ""}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-foreground">@{c.username}</span>
                            <Badge className={`${config.color} text-[8px]`}>
                              <Icon className="h-2.5 w-2.5 mr-0.5" />{config.label}
                            </Badge>
                            {c.sent && <CheckCircle2 className="h-3 w-3 text-green-400" />}
                            {c.dmSent && <Send className="h-3 w-3 text-blue-400" />}
                          </div>
                          <p className="text-xs text-foreground mt-0.5">{c.text}</p>
                          {c.aiReply && (
                            <p className="text-[10px] text-primary mt-1 p-1.5 bg-primary/5 rounded">↩ {c.aiReply}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => sendReply(c)} disabled={c.sent || sendingReply === c.id}>
                            {sendingReply === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageSquare className="h-3 w-3" />}
                          </Button>
                          {c.signal === "buying" && (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => sendDmToLead(c)} disabled={c.dmSent}>
                              <Send className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </>
      )}

      {comments.length === 0 && !scanning && (
        <div className="text-center py-6">
          <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">Enter a post's media ID to scan comments for buying signals</p>
          <p className="text-[10px] text-muted-foreground mt-1">AI detects "price?", "link?", "how much?" and auto-responds</p>
        </div>
      )}
    </div>
  );
};

export default IGSmartComments;

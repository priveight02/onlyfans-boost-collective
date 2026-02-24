import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Megaphone, Send, UserPlus, Shield } from "lucide-react";

interface Props { selectedAccount: string; selectedPage?: any; }

const MESSAGE_TAGS = [
  { value: "CONFIRMED_EVENT_UPDATE", label: "Confirmed Event Update" },
  { value: "POST_PURCHASE_UPDATE", label: "Post Purchase Update" },
  { value: "ACCOUNT_UPDATE", label: "Account Update" },
  { value: "HUMAN_AGENT", label: "Human Agent (7-day window)" },
];

const FBMarketingMessages = ({ selectedAccount, selectedPage }: Props) => {
  const [loading, setLoading] = useState(false);
  const [recipientId, setRecipientId] = useState("");
  const [message, setMessage] = useState("");
  const [tag, setTag] = useState("CONFIRMED_EVENT_UPDATE");
  const [mode, setMode] = useState<"marketing" | "human">("marketing");

  const callApi = useCallback(async (action: string, params?: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("facebook-api", { body: { action, account_id: selectedAccount, params } });
      if (error) { toast.info(error.message); return null; }
      if (!data?.success) { toast.info(data?.error || "Action failed"); return null; }
      return data.data;
    } catch (e: any) { toast.info(e.message); return null; }
    finally { setLoading(false); }
  }, [selectedAccount]);

  const sendMessage = async () => {
    if (!selectedPage || !recipientId || !message) { toast.error("Page, recipient, and message required"); return; }
    const action = mode === "human" ? "send_human_agent_message" : "send_marketing_message";
    const d = await callApi(action, {
      page_id: selectedPage.id, page_access_token: selectedPage.access_token,
      recipient_id: recipientId, message, tag: mode === "marketing" ? tag : undefined,
    });
    if (d) { toast.success("Message sent!"); setMessage(""); }
  };

  if (!selectedPage) return <p className="text-xs text-muted-foreground p-4">Select a page from the Dashboard tab first.</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <Badge variant="outline" className="border-blue-500/30 text-blue-400">{selectedPage.name}</Badge>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant={mode === "marketing" ? "default" : "outline"} onClick={() => setMode("marketing")} className="text-xs">
          <Megaphone className="h-3 w-3 mr-1" />Marketing
        </Button>
        <Button size="sm" variant={mode === "human" ? "default" : "outline"} onClick={() => setMode("human")} className="text-xs">
          <Shield className="h-3 w-3 mr-1" />Human Agent
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          <h4 className="text-xs font-bold text-foreground flex items-center gap-1">
            {mode === "human" ? <><Shield className="h-3.5 w-3.5 text-green-400" />Human Agent Message</> : <><Megaphone className="h-3.5 w-3.5 text-orange-400" />Marketing Message</>}
          </h4>
          {mode === "human" && <p className="text-[10px] text-muted-foreground">Respond within 7 days of the user's last message.</p>}
          <Input placeholder="Recipient PSID" value={recipientId} onChange={e => setRecipientId(e.target.value)} className="text-sm" />
          {mode === "marketing" && (
            <Select value={tag} onValueChange={setTag}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MESSAGE_TAGS.filter(t => t.value !== "HUMAN_AGENT").map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Textarea placeholder="Message content..." value={message} onChange={e => setMessage(e.target.value)} className="min-h-[80px] text-sm" />
          <Button size="sm" onClick={sendMessage} disabled={loading}><Send className="h-3.5 w-3.5 mr-1" />Send</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default FBMarketingMessages;

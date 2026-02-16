import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock, Plus, Trash2, ArrowRight, ArrowLeft, ArrowLeftRight,
  Loader2, Power, PowerOff, ChevronDown, ChevronUp,
  MessageSquare, Image, Video, FileText,
} from "lucide-react";
import CreditCostBadge from "./CreditCostBadge";

interface KeywordDelay {
  id: string;
  account_id: string;
  keyword: string;
  delay_seconds: number;
  direction: "before" | "after" | "both";
  match_type: "exact" | "contains" | "starts_with" | "ends_with";
  is_active: boolean;
  created_at: string;
  response_type: "none" | "text" | "image" | "video" | "media";
  response_message: string | null;
  response_media_url: string | null;
}

interface KeywordDelayManagerProps {
  accountId: string;
}

const DIRECTION_LABELS: Record<string, { label: string; icon: any; desc: string }> = {
  before: { label: "Before", icon: ArrowLeft, desc: "Delay BEFORE AI replies when keyword detected in fan message" },
  after: { label: "After", icon: ArrowRight, desc: "Delay AFTER AI replies when keyword detected in AI reply" },
  both: { label: "Both", icon: ArrowLeftRight, desc: "Delay both before AND after when keyword is detected anywhere" },
};

const MATCH_LABELS: Record<string, string> = {
  exact: "Exact match",
  contains: "Contains",
  starts_with: "Starts with",
  ends_with: "Ends with",
};

const RESPONSE_TYPE_LABELS: Record<string, { label: string; icon: any }> = {
  none: { label: "Delay Only", icon: Clock },
  text: { label: "Send Text", icon: MessageSquare },
  image: { label: "Send Image", icon: Image },
  video: { label: "Send Video", icon: Video },
  media: { label: "Send Media", icon: FileText },
};

const KeywordDelayManager = ({ accountId }: KeywordDelayManagerProps) => {
  const [delays, setDelays] = useState<KeywordDelay[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  // New rule form
  const [newKeyword, setNewKeyword] = useState("");
  const [newDelay, setNewDelay] = useState("30");
  const [newDirection, setNewDirection] = useState<"before" | "after" | "both">("before");
  const [newMatchType, setNewMatchType] = useState<"exact" | "contains" | "starts_with" | "ends_with">("contains");
  const [newResponseType, setNewResponseType] = useState<"none" | "text" | "image" | "video" | "media">("none");
  const [newResponseMessage, setNewResponseMessage] = useState("");
  const [newResponseMediaUrl, setNewResponseMediaUrl] = useState("");

  const loadDelays = useCallback(async () => {
    const { data, error } = await supabase
      .from("ai_keyword_delays")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false });
    if (!error && data) setDelays(data as KeywordDelay[]);
    setLoading(false);
  }, [accountId]);

  useEffect(() => { loadDelays(); }, [loadDelays]);

  const addRule = async () => {
    const keyword = newKeyword.trim().toLowerCase();
    if (!keyword) { toast.error("Enter a keyword"); return; }
    if (parseInt(newDelay) < 1) { toast.error("Delay must be at least 1 second"); return; }
    if (delays.some(d => d.keyword.toLowerCase() === keyword && d.direction === newDirection)) {
      toast.error("This keyword + direction combo already exists");
      return;
    }
    if (newResponseType === "text" && !newResponseMessage.trim()) {
      toast.error("Enter a message to send"); return;
    }
    if ((newResponseType === "image" || newResponseType === "video" || newResponseType === "media") && !newResponseMediaUrl.trim()) {
      toast.error("Enter a media URL"); return;
    }
    setSaving(true);
    const { error } = await supabase.from("ai_keyword_delays").insert({
      account_id: accountId,
      keyword,
      delay_seconds: parseInt(newDelay),
      direction: newDirection,
      match_type: newMatchType,
      is_active: true,
      response_type: newResponseType,
      response_message: newResponseMessage.trim() || null,
      response_media_url: newResponseMediaUrl.trim() || null,
    });
    if (error) {
      toast.error("Failed to add rule");
    } else {
      toast.success(`Delay rule added: "${keyword}" → ${newDelay}s ${newDirection}`);
      setNewKeyword(""); setNewDelay("30"); setAdding(false);
      setNewResponseType("none"); setNewResponseMessage(""); setNewResponseMediaUrl("");
      await loadDelays();
    }
    setSaving(false);
  };

  const toggleRule = async (id: string, currentActive: boolean) => {
    await supabase.from("ai_keyword_delays").update({ is_active: !currentActive }).eq("id", id);
    setDelays(prev => prev.map(d => d.id === id ? { ...d, is_active: !currentActive } : d));
  };

  const deleteRule = async (id: string) => {
    await supabase.from("ai_keyword_delays").delete().eq("id", id);
    setDelays(prev => prev.filter(d => d.id !== id));
    toast.success("Rule deleted");
  };

  const activeCount = delays.filter(d => d.is_active).length;
  const DirIcon = (dir: string) => {
    const cfg = DIRECTION_LABELS[dir];
    const Icon = cfg?.icon || ArrowRight;
    return <Icon className="h-2.5 w-2.5" />;
  };

  const ResponseIcon = (type: string) => {
    const cfg = RESPONSE_TYPE_LABELS[type];
    const Icon = cfg?.icon || Clock;
    return <Icon className="h-2.5 w-2.5" />;
  };

  return (
    <div className="border-b border-border/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-muted/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-[10px] font-semibold text-foreground uppercase tracking-wider">Keyword Delays</span>
          <CreditCostBadge cost="3–5" variant="header" />
          {activeCount > 0 && (
            <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[9px] px-1.5 py-0">
              {activeCount}
            </Badge>
          )}
        </div>
        {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-3 pb-2.5">
          {loading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Loading...</span>
            </div>
          ) : (
            <>
              {delays.length > 0 && (
                <ScrollArea className="max-h-[220px]">
                  <div className="space-y-1.5 mb-2">
                    {delays.map(rule => (
                      <div
                        key={rule.id}
                        className={`flex items-center gap-1.5 p-1.5 rounded border text-[9px] transition-all ${
                          rule.is_active
                            ? "border-amber-500/20 bg-amber-500/5"
                            : "border-border/30 bg-muted/5 opacity-50"
                        }`}
                      >
                        <button onClick={() => toggleRule(rule.id, rule.is_active)} className="flex-shrink-0" title={rule.is_active ? "Disable" : "Enable"}>
                          {rule.is_active ? <Power className="h-3 w-3 text-green-400" /> : <PowerOff className="h-3 w-3 text-red-400" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-mono font-semibold text-foreground truncate">"{rule.keyword}"</span>
                            <Badge variant="outline" className="text-[8px] px-1 py-0 border-muted-foreground/20">
                              {MATCH_LABELS[rule.match_type]}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5 text-muted-foreground">
                            {DirIcon(rule.direction)}
                            <span>{DIRECTION_LABELS[rule.direction]?.label}</span>
                            <span>•</span>
                            <span className="text-amber-400 font-semibold">{rule.delay_seconds}s</span>
                            {rule.response_type && rule.response_type !== "none" && (
                              <>
                                <span>•</span>
                                {ResponseIcon(rule.response_type)}
                                <span className="text-blue-400">{RESPONSE_TYPE_LABELS[rule.response_type]?.label}</span>
                              </>
                            )}
                          </div>
                          {rule.response_message && (
                            <div className="text-[8px] text-muted-foreground/70 truncate mt-0.5">
                              → "{rule.response_message}"
                            </div>
                          )}
                        </div>
                        <button onClick={() => deleteRule(rule.id)} className="flex-shrink-0 text-red-400/60 hover:text-red-400">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {delays.length === 0 && !adding && (
                <p className="text-[9px] text-muted-foreground/50 italic py-1">No keyword delays configured</p>
              )}

              {adding ? (
                <div className="space-y-1.5 p-2 rounded border border-amber-500/20 bg-amber-500/5">
                  <Input
                    value={newKeyword}
                    onChange={e => setNewKeyword(e.target.value)}
                    placeholder="Keyword (e.g. price, nude, meet)"
                    className="h-7 text-[10px] bg-background"
                    onKeyDown={e => e.key === "Enter" && addRule()}
                  />
                  <div className="flex gap-1.5">
                    <div className="flex-1">
                      <Select value={newDirection} onValueChange={(v: any) => setNewDirection(v)}>
                        <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(DIRECTION_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k} className="text-[10px]">
                              <div className="flex items-center gap-1.5"><v.icon className="h-3 w-3" />{v.label}</div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-16">
                      <Input type="number" value={newDelay} onChange={e => setNewDelay(e.target.value)} min={1} max={600} className="h-7 text-[10px] bg-background text-center" placeholder="sec" />
                    </div>
                  </div>
                  <Select value={newMatchType} onValueChange={(v: any) => setNewMatchType(v)}>
                    <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(MATCH_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-[10px]">{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Response type */}
                  <Select value={newResponseType} onValueChange={(v: any) => setNewResponseType(v)}>
                    <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(RESPONSE_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-[10px]">
                          <div className="flex items-center gap-1.5"><v.icon className="h-3 w-3" />{v.label}</div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Conditional response fields */}
                  {newResponseType === "text" && (
                    <Textarea
                      value={newResponseMessage}
                      onChange={e => setNewResponseMessage(e.target.value)}
                      placeholder="Message to send after delay..."
                      className="text-[10px] bg-background min-h-[50px] resize-none"
                    />
                  )}
                  {(newResponseType === "image" || newResponseType === "video" || newResponseType === "media") && (
                    <>
                      <Input
                        value={newResponseMediaUrl}
                        onChange={e => setNewResponseMediaUrl(e.target.value)}
                        placeholder="Media URL (image/video link)"
                        className="h-7 text-[10px] bg-background"
                      />
                      <Textarea
                        value={newResponseMessage}
                        onChange={e => setNewResponseMessage(e.target.value)}
                        placeholder="Optional caption text..."
                        className="text-[10px] bg-background min-h-[36px] resize-none"
                      />
                    </>
                  )}

                  <p className="text-[8px] text-muted-foreground/50 leading-tight">
                    {DIRECTION_LABELS[newDirection]?.desc}
                    {newResponseType !== "none" && ` • Will send ${newResponseType} after the delay`}
                  </p>
                  <div className="flex gap-1.5">
                    <Button size="sm" onClick={addRule} disabled={saving} className="h-6 text-[9px] flex-1 bg-amber-600 hover:bg-amber-700">
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save Rule"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setAdding(false)} className="h-6 text-[9px]">Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAdding(true)}
                  className="w-full h-6 text-[9px] gap-1 border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                >
                  <Plus className="h-2.5 w-2.5" />
                  Add Keyword Delay
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default KeywordDelayManager;

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarDays, Plus, RefreshCw, Trash2, ExternalLink, Clock } from "lucide-react";

interface Props { selectedAccount: string; }

const IGEventsManager = ({ selectedAccount }: Props) => {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", start_time: "", end_time: "", event_url: "", cover_media_url: "",
  });

  const callApi = async (action: string, params: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("instagram-api", {
        body: { action, account_id: selectedAccount, params },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "API error");
      return data.data;
    } finally { setLoading(false); }
  };

  const loadEvents = async () => {
    try {
      const result = await callApi("get_upcoming_events", {});
      setEvents(result?.data || []);
      toast.success(`Found ${result?.data?.length || 0} events`);
    } catch (e: any) { toast.error(e.message); }
  };

  const createEvent = async () => {
    if (!form.title || !form.start_time) { toast.error("Title and start time required"); return; }
    try {
      await callApi("create_upcoming_event", {
        title: form.title,
        start_time: new Date(form.start_time).toISOString(),
        ...(form.end_time ? { end_time: new Date(form.end_time).toISOString() } : {}),
        ...(form.event_url ? { event_url: form.event_url } : {}),
        ...(form.cover_media_url ? { cover_media_url: form.cover_media_url } : {}),
        ...(form.description ? { description: form.description } : {}),
      });
      toast.success("Event created!");
      setForm({ title: "", description: "", start_time: "", end_time: "", event_url: "", cover_media_url: "" });
      setShowCreate(false);
      loadEvents();
    } catch (e: any) { toast.error(e.message); }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      await callApi("delete_upcoming_event", { event_id: eventId });
      toast.success("Event deleted");
      loadEvents();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-3 pt-3">
      <div className="flex items-center justify-between">
        <Button size="sm" variant="outline" onClick={loadEvents} disabled={loading} className="text-xs">
          {loading ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
          Load Events
        </Button>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="text-xs">
          <Plus className="h-3 w-3 mr-1" />{showCreate ? "Cancel" : "Create Event"}
        </Button>
      </div>

      {showCreate && (
        <div className="bg-muted/30 rounded-lg p-3 space-y-2">
          <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Event title *" className="text-sm" />
          <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description" rows={2} className="text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground">Start Time *</label>
              <Input type="datetime-local" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} className="text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">End Time</label>
              <Input type="datetime-local" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} className="text-sm" />
            </div>
          </div>
          <Input value={form.event_url} onChange={e => setForm(p => ({ ...p, event_url: e.target.value }))} placeholder="Event URL (optional)" className="text-sm" />
          <Input value={form.cover_media_url} onChange={e => setForm(p => ({ ...p, cover_media_url: e.target.value }))} placeholder="Cover image URL (optional)" className="text-sm" />
          <Button size="sm" onClick={createEvent} disabled={loading}>
            <CalendarDays className="h-3 w-3 mr-1" />Create Event
          </Button>
        </div>
      )}

      <ScrollArea className="max-h-[300px]">
        <div className="space-y-2">
          {events.map((evt: any) => (
            <div key={evt.id} className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{evt.title}</p>
                  {evt.description && <p className="text-xs text-muted-foreground mt-0.5">{evt.description}</p>}
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(evt.start_time).toLocaleString()}</span>
                    {evt.end_time && <span>→ {new Date(evt.end_time).toLocaleString()}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  {evt.event_url && (
                    <Button size="sm" variant="ghost" onClick={() => window.open(evt.event_url, "_blank")} className="h-7 w-7 p-0">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => deleteEvent(evt.id)} className="h-7 w-7 p-0 text-red-400">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {events.length === 0 && !loading && !showCreate && (
        <div className="text-center py-4">
          <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">No events loaded. Click "Load Events" to fetch.</p>
        </div>
      )}
    </div>
  );
};

export default IGEventsManager;

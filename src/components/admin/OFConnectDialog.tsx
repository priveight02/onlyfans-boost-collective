import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Link2, Shield, CheckCircle2, AlertTriangle } from "lucide-react";

interface OFConnectDialogProps {
  account: any;
  onClose: () => void;
  onSuccess: () => void;
}

const OFConnectDialog = ({ account, onClose, onSuccess }: OFConnectDialogProps) => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    of_auth_id: account.of_auth_id || "",
    of_session_token: account.of_session_token || "",
    of_user_agent: account.of_user_agent || "",
    of_x_bc: account.of_x_bc || "",
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.of_session_token.trim()) {
      toast.error("Session token is required");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("managed_accounts")
      .update({
        of_auth_id: form.of_auth_id || null,
        of_session_token: form.of_session_token,
        of_user_agent: form.of_user_agent || null,
        of_x_bc: form.of_x_bc || null,
        of_connected: true,
        of_connected_at: new Date().toISOString(),
        platform: "onlyfans",
      } as any)
      .eq("id", account.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("OF account connected!");
      onSuccess();
      onClose();
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect this OF account?")) return;
    setSaving(true);
    await supabase
      .from("managed_accounts")
      .update({
        of_auth_id: null,
        of_session_token: null,
        of_user_agent: null,
        of_x_bc: null,
        of_connected: false,
        of_connected_at: null,
      } as any)
      .eq("id", account.id);
    setSaving(false);
    toast.success("Disconnected");
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-[hsl(220,60%,10%)] border border-white/10 rounded-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-accent" />
            <h2 className="text-base font-bold text-white">
              {account.of_connected ? "Manage" : "Connect"} OF Account
            </h2>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} className="text-white/30 hover:text-white h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Status */}
        <div className={`mx-5 mt-4 p-3 rounded-lg flex items-center gap-2 ${account.of_connected ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-amber-500/10 border border-amber-500/20"}`}>
          {account.of_connected ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">Connected to @{account.username}</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-amber-400">Not connected — enter your API credentials below</span>
            </>
          )}
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-3.5 w-3.5 text-white/40" />
              <span className="text-xs text-white/50">Credentials are stored securely and only accessible by admins</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-white/50">Auth ID (User ID from OF)</Label>
            <Input value={form.of_auth_id} onChange={e => setForm(p => ({ ...p, of_auth_id: e.target.value }))} className="bg-white/5 border-white/10 text-white h-9 text-sm font-mono" placeholder="e.g. 123456789" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-white/50">Session Token (sess cookie) *</Label>
            <Input value={form.of_session_token} onChange={e => setForm(p => ({ ...p, of_session_token: e.target.value }))} className="bg-white/5 border-white/10 text-white h-9 text-sm font-mono" placeholder="sess=..." type="password" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-white/50">User Agent</Label>
            <Input value={form.of_user_agent} onChange={e => setForm(p => ({ ...p, of_user_agent: e.target.value }))} className="bg-white/5 border-white/10 text-white h-9 text-sm font-mono" placeholder="Mozilla/5.0..." />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-white/50">x-bc Header</Label>
            <Input value={form.of_x_bc} onChange={e => setForm(p => ({ ...p, of_x_bc: e.target.value }))} className="bg-white/5 border-white/10 text-white h-9 text-sm font-mono" placeholder="x-bc value" type="password" />
          </div>

          <div className="flex gap-2 pt-2">
            {account.of_connected && (
              <Button type="button" variant="ghost" onClick={handleDisconnect} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                Disconnect
              </Button>
            )}
            <div className="flex-1" />
            <Button type="button" variant="ghost" onClick={onClose} className="text-white/50 hover:text-white hover:bg-white/10">Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-accent hover:bg-accent/80">
              {saving ? "Saving..." : account.of_connected ? "Update" : "Connect"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OFConnectDialog;

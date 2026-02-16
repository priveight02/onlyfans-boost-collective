import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCreditAction } from "@/hooks/useCreditAction";
import CreditCostBadge from "./CreditCostBadge";

interface CRMAddAccountDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editAccount?: any;
}

const CRMAddAccountDialog = ({ open, onClose, onSuccess, editAccount }: CRMAddAccountDialogProps) => {
  const [loading, setLoading] = useState(false);
  const { performAction } = useCreditAction();
  const [form, setForm] = useState({
    username: editAccount?.username || "",
    display_name: editAccount?.display_name || "",
    bio: editAccount?.bio || "",
    platform: editAccount?.platform || "generic",
    status: editAccount?.status || "active",
    tier: editAccount?.tier || "standard",
    contact_email: editAccount?.contact_email || "",
    contact_phone: editAccount?.contact_phone || "",
    monthly_revenue: editAccount?.monthly_revenue?.toString() || "0",
    subscriber_count: editAccount?.subscriber_count?.toString() || "0",
    notes: editAccount?.notes || "",
    tags: editAccount?.tags?.join(", ") || "",
  });

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username.trim()) {
      toast.error("Username is required");
      return;
    }

    setLoading(true);
    const payload = {
      username: form.username.trim().toLowerCase(),
      display_name: form.display_name || null,
      bio: form.bio || null,
      platform: form.platform,
      status: form.status,
      tier: form.tier,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      monthly_revenue: parseFloat(form.monthly_revenue) || 0,
      subscriber_count: parseInt(form.subscriber_count) || 0,
      notes: form.notes || null,
      tags: form.tags ? form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
    };

    const actionType = editAccount ? 'update_account' : 'create_account';
    await performAction(actionType, async () => {
      let error;
      if (editAccount) {
        ({ error } = await supabase.from("managed_accounts").update(payload).eq("id", editAccount.id));
      } else {
        ({ error } = await supabase.from("managed_accounts").insert(payload));
      }

      if (error) {
        toast.error(error.message);
        throw error;
      }
      toast.success(editAccount ? "Account updated" : "Account added");
      onSuccess();
      onClose();
    });
    setLoading(false);
  };

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-[hsl(220,60%,10%)] border border-white/10 rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-base font-bold text-white">{editAccount ? "Edit Account" : "Add Account"}</h2>
          <Button size="icon" variant="ghost" onClick={onClose} className="text-white/30 hover:text-white h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-white/50">Username *</Label>
              <Input value={form.username} onChange={(e) => update("username", e.target.value)} className="bg-white/5 border-white/10 text-white h-9 text-sm" placeholder="username" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-white/50">Display Name</Label>
              <Input value={form.display_name} onChange={(e) => update("display_name", e.target.value)} className="bg-white/5 border-white/10 text-white h-9 text-sm" placeholder="Display Name" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-white/50">Bio</Label>
            <textarea value={form.bio} onChange={(e) => update("bio", e.target.value)} className="w-full min-h-[80px] p-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:border-accent focus:outline-none" placeholder="Account bio..." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-white/50">Status</Label>
              <Select value={form.status} onValueChange={(v) => update("status", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[hsl(220,60%,13%)] border-white/10">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-white/50">Tier</Label>
              <Select value={form.tier} onValueChange={(v) => update("tier", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[hsl(220,60%,13%)] border-white/10">
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-white/50">Platform</Label>
              <Select value={form.platform} onValueChange={(v) => update("platform", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[hsl(220,60%,13%)] border-white/10">
                  <SelectItem value="generic">Generic</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="twitter">Twitter/X</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-white/50">Monthly Revenue ($)</Label>
              <Input type="number" value={form.monthly_revenue} onChange={(e) => update("monthly_revenue", e.target.value)} className="bg-white/5 border-white/10 text-white h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-white/50">Subscribers</Label>
              <Input type="number" value={form.subscriber_count} onChange={(e) => update("subscriber_count", e.target.value)} className="bg-white/5 border-white/10 text-white h-9 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-white/50">Contact Email</Label>
              <Input type="email" value={form.contact_email} onChange={(e) => update("contact_email", e.target.value)} className="bg-white/5 border-white/10 text-white h-9 text-sm" placeholder="email@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-white/50">Phone</Label>
              <Input value={form.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} className="bg-white/5 border-white/10 text-white h-9 text-sm" placeholder="+1..." />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-white/50">Tags (comma-separated)</Label>
            <Input value={form.tags} onChange={(e) => update("tags", e.target.value)} className="bg-white/5 border-white/10 text-white h-9 text-sm" placeholder="fitness, lifestyle, premium" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-white/50">Internal Notes</Label>
            <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} className="w-full min-h-[60px] p-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:border-accent focus:outline-none" placeholder="Private notes..." />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1 text-white/50 hover:text-white hover:bg-white/10">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-accent hover:bg-accent/80 gap-2">
              {loading ? "Saving..." : editAccount ? "Update" : "Add Account"} <CreditCostBadge cost={editAccount ? 2 : 5} />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CRMAddAccountDialog;

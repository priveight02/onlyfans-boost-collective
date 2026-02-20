import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cachedFetch, invalidateNamespace } from "@/lib/supabaseCache";
import CRMAccountSearch from "./CRMAccountSearch";
import CRMAccountCard from "./CRMAccountCard";
import CRMAccountDetail from "./CRMAccountDetail";
import CRMAddAccountDialog from "./CRMAddAccountDialog";
import OFConnectDialog from "./OFConnectDialog";
import { Loader2, Inbox } from "lucide-react";
import { useCreditAction } from "@/hooks/useCreditAction";
import CreditCostBadge from "./CreditCostBadge";

const CRMAccountsTab = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const [editAccount, setEditAccount] = useState<any | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [connectAccount, setConnectAccount] = useState<any | null>(null);
  const { performAction } = useCreditAction();

  const fetchAccounts = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const data = await cachedFetch("global", "crm_accounts", async () => {
        const { data, error } = await supabase
          .from("managed_accounts")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
      }, undefined, { ttlMs: 5 * 60 * 1000, forceRefresh });
      setAccounts(data);
    } catch {
      toast.error("Failed to load accounts");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const filtered = useMemo(() => {
    let result = accounts;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.username.toLowerCase().includes(q) ||
          a.display_name?.toLowerCase().includes(q) ||
          a.contact_email?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") result = result.filter((a) => a.status === statusFilter);
    if (tierFilter !== "all") result = result.filter((a) => a.tier === tierFilter);
    return result;
  }, [accounts, search, statusFilter, tierFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this account?")) return;
    await performAction('delete_account', async () => {
      const { error } = await supabase.from("managed_accounts").delete().eq("id", id);
      if (error) {
        toast.error("Failed to delete");
        throw error;
      }
      toast.success("Account deleted");
      invalidateNamespace("global", "crm_accounts");
      invalidateNamespace("global", "managed_accounts");
      fetchAccounts(true);
    });
  };

  const handleEdit = (account: any) => {
    setEditAccount(account);
    setShowAdd(true);
    setSelectedAccount(null);
  };

  const handleUnpause = async (account: any) => {
    const { error } = await supabase
      .from("managed_accounts")
      .update({ status: "active" })
      .eq("id", account.id);
    if (error) {
      toast.error("Failed to reactivate account");
    } else {
      toast.success(`${account.display_name || account.username} reactivated`);
      invalidateNamespace("global", "crm_accounts");
      fetchAccounts(true);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white font-heading">Accounts</h2>
          <p className="text-sm text-white/30 mt-0.5">Manage your creator accounts</p>
        </div>
        <CreditCostBadge cost="1-5" variant="header" label="per action" />
      </div>

      <CRMAccountSearch
        onSearch={setSearch}
        onFilterStatus={setStatusFilter}
        onFilterTier={setTierFilter}
        onAddAccount={() => { setEditAccount(null); setShowAdd(true); }}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-7 h-7 border-2 border-[hsl(217,91%,60%)] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-white/30">Loading accounts...</span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/15">
          <Inbox className="h-10 w-10 mb-3" />
          <p className="text-sm text-white/25">{search ? "No accounts match your search" : "No accounts yet"}</p>
          <p className="text-xs mt-1 text-white/15">Add your first account to get started</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((account) => (
            <CRMAccountCard
              key={account.id}
              account={account}
              onSelect={setSelectedAccount}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onConnect={setConnectAccount}
              onUnpause={handleUnpause}
            />
          ))}
        </div>
      )}

      {/* Summary bar */}
      {!loading && accounts.length > 0 && (
        <div className="flex items-center gap-4 text-[11px] text-white/20 pt-3 border-t border-white/[0.04]">
          <span>{filtered.length} of {accounts.length} accounts</span>
          <span className="text-white/10">|</span>
          <span>Monthly: ${filtered.reduce((s, a) => s + (a.monthly_revenue || 0), 0).toLocaleString()}</span>
          <span className="text-white/10">|</span>
          <span>{filtered.filter((a) => a.status === "active").length} active</span>
        </div>
      )}

      {selectedAccount && (
        <CRMAccountDetail
          account={selectedAccount}
          onClose={() => setSelectedAccount(null)}
          onEdit={handleEdit}
        />
      )}

      <CRMAddAccountDialog
        open={showAdd}
        onClose={() => { setShowAdd(false); setEditAccount(null); }}
        onSuccess={fetchAccounts}
        editAccount={editAccount}
      />

      {connectAccount && (
        <OFConnectDialog
          account={connectAccount}
          onClose={() => setConnectAccount(null)}
          onSuccess={fetchAccounts}
        />
      )}
    </div>
  );
};

export default CRMAccountsTab;

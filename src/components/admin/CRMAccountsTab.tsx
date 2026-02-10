import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CRMAccountSearch from "./CRMAccountSearch";
import CRMAccountCard from "./CRMAccountCard";
import CRMAccountDetail from "./CRMAccountDetail";
import CRMAddAccountDialog from "./CRMAddAccountDialog";
import OFConnectDialog from "./OFConnectDialog";
import { Loader2, Inbox } from "lucide-react";

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

  const fetchAccounts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("managed_accounts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load accounts");
    } else {
      setAccounts(data || []);
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
    const { error } = await supabase.from("managed_accounts").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Account deleted");
      fetchAccounts();
    }
  };

  const handleEdit = (account: any) => {
    setEditAccount(account);
    setShowAdd(true);
    setSelectedAccount(null);
  };

  return (
    <div className="space-y-4">
      <CRMAccountSearch
        onSearch={setSearch}
        onFilterStatus={setStatusFilter}
        onFilterTier={setTierFilter}
        onAddAccount={() => { setEditAccount(null); setShowAdd(true); }}
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-white/20">
          <Inbox className="h-10 w-10 mb-3" />
          <p className="text-sm">{search ? "No accounts match your search" : "No accounts yet"}</p>
          <p className="text-xs mt-1">Add your first account to get started</p>
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
            />
          ))}
        </div>
      )}

      {/* Summary bar */}
      {!loading && accounts.length > 0 && (
        <div className="flex items-center gap-4 text-[11px] text-white/25 pt-2 border-t border-white/[0.04]">
          <span>{filtered.length} of {accounts.length} accounts</span>
          <span>•</span>
          <span>Total monthly: ${filtered.reduce((s, a) => s + (a.monthly_revenue || 0), 0).toLocaleString()}</span>
          <span>•</span>
          <span>{filtered.filter((a) => a.status === "active").length} active</span>
        </div>
      )}

      {/* Detail modal */}
      {selectedAccount && (
        <CRMAccountDetail
          account={selectedAccount}
          onClose={() => setSelectedAccount(null)}
          onEdit={handleEdit}
        />
      )}

      {/* Add/Edit dialog */}
      <CRMAddAccountDialog
        open={showAdd}
        onClose={() => { setShowAdd(false); setEditAccount(null); }}
        onSuccess={fetchAccounts}
        editAccount={editAccount}
      />

      {/* OF Connect dialog */}
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

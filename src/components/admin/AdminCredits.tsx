import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Coins, Search, Plus, History, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface UserResult {
  user_id: string;
  username: string | null;
  display_name: string | null;
  email: string | null;
}

const AdminCredits = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<UserResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [granting, setGranting] = useState(false);
  const [recentGrants, setRecentGrants] = useState<any[]>([]);

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    const { data } = await supabase
      .from("profiles")
      .select("user_id, username, display_name, email")
      .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
      .limit(10);
    setUsers((data as UserResult[]) || []);
  };

  const loadRecentGrants = async () => {
    const { data } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("type", "admin_grant")
      .order("created_at", { ascending: false })
      .limit(20);
    setRecentGrants(data || []);
  };

  useEffect(() => {
    loadRecentGrants();
  }, []);

  const handleGrant = async () => {
    if (!selectedUser || !amount || parseInt(amount) <= 0) {
      toast.error("Select a user and enter a valid amount");
      return;
    }

    setGranting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-grant-credits", {
        body: {
          targetUserId: selectedUser.user_id,
          amount: parseInt(amount),
          reason: reason || `Admin granted ${amount} credits`,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`✅ Granted ${amount} credits to ${selectedUser.display_name || selectedUser.username}`);
      setAmount("");
      setReason("");
      setSelectedUser(null);
      loadRecentGrants();
    } catch (err: any) {
      toast.error(err.message || "Failed to grant credits");
    } finally {
      setGranting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grant Credits */}
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-400" />
              Grant Credits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* User Search */}
            <div className="flex gap-2">
              <Input
                placeholder="Search by username, name, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
              <Button onClick={searchUsers} variant="outline" className="border-white/10 text-white hover:bg-white/10">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {/* Search Results */}
            {users.length > 0 && !selectedUser && (
              <div className="space-y-1 max-h-48 overflow-y-auto rounded-lg border border-white/10">
                {users.map((u) => (
                  <button
                    key={u.user_id}
                    onClick={() => { setSelectedUser(u); setUsers([]); }}
                    className="w-full text-left px-3 py-2 hover:bg-white/10 transition-colors flex items-center gap-2"
                  >
                    <User className="h-4 w-4 text-white/40" />
                    <div>
                      <span className="text-white text-sm font-medium">{u.display_name || u.username}</span>
                      <span className="text-white/40 text-xs ml-2">@{u.username}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Selected User */}
            {selectedUser && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-amber-400" />
                  <span className="text-white font-medium">{selectedUser.display_name || selectedUser.username}</span>
                  <span className="text-white/40 text-xs">@{selectedUser.username}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelectedUser(null)} className="text-white/40 hover:text-white h-7 px-2">
                  Change
                </Button>
              </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <label className="text-sm text-white/70">Amount (credits)</label>
              <Input
                type="number"
                placeholder="Enter amount..."
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <label className="text-sm text-white/70">Reason (optional)</label>
              <Input
                placeholder="Why are you granting these credits?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <Button
              onClick={handleGrant}
              disabled={!selectedUser || !amount || granting}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold"
            >
              {granting ? (
                <span className="animate-pulse">Granting...</span>
              ) : (
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Grant {amount ? `${parseInt(amount).toLocaleString()} Credits` : "Credits"}
                </span>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Grants */}
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <History className="h-5 w-5 text-white/60" />
              Recent Grants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {recentGrants.length === 0 ? (
                <p className="text-white/40 text-sm text-center py-8">No grants yet</p>
              ) : (
                recentGrants.map((grant) => (
                  <div key={grant.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                    <div>
                      <div className="text-sm text-white font-medium">{grant.description}</div>
                      <div className="text-xs text-white/40">
                        {new Date(grant.created_at).toLocaleString()}
                      </div>
                    </div>
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                      +{grant.amount.toLocaleString()}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminCredits;

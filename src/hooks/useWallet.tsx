import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface WalletContextType {
  balance: number;
  purchaseCount: number;
  totalPurchased: number;
  totalSpent: number;
  loading: boolean;
  refreshWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [purchaseCount, setPurchaseCount] = useState(0);
  const [totalPurchased, setTotalPurchased] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [loading, setLoading] = useState(true);

  const refreshWallet = useCallback(async () => {
    if (!user) {
      setBalance(0);
      setPurchaseCount(0);
      setTotalPurchased(0);
      setTotalSpent(0);
      setLoading(false);
      return;
    }

    try {
      // Read directly from DB (user has SELECT-only RLS)
      const { data: wallet, error } = await supabase
        .from('wallets')
        .select('balance, total_purchased, total_spent, purchase_count')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setBalance(wallet?.balance || 0);
      setPurchaseCount(wallet?.purchase_count || 0);
      setTotalPurchased(wallet?.total_purchased || 0);
      setTotalSpent(wallet?.total_spent || 0);
    } catch (err) {
      console.error('Failed to fetch wallet:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshWallet();
  }, [refreshWallet]);

  // Realtime subscription - wallet updates instantly when edge functions modify balance
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`wallet-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const w = payload.new as any;
          setBalance(w.balance || 0);
          setPurchaseCount(w.purchase_count || 0);
          setTotalPurchased(w.total_purchased || 0);
          setTotalSpent(w.total_spent || 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <WalletContext.Provider value={{ balance, purchaseCount, totalPurchased, totalSpent, loading, refreshWallet }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within WalletProvider');
  return context;
};

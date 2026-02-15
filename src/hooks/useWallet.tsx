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
      const { data, error } = await supabase.functions.invoke('check-wallet');
      if (error) throw error;
      setBalance(data.balance || 0);
      setPurchaseCount(data.purchase_count || 0);
      setTotalPurchased(data.total_purchased || 0);
      setTotalSpent(data.total_spent || 0);
    } catch (err) {
      console.error('Failed to fetch wallet:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshWallet();
  }, [refreshWallet]);

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

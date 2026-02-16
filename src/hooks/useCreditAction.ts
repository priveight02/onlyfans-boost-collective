import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/hooks/useWallet';
import { toast } from 'sonner';
import { CRM_ACTION_COSTS, MIN_BALANCE_REQUIREMENTS } from '@/data/creditCosts';

// Re-export for backwards compatibility
export { CRM_ACTION_COSTS, MIN_BALANCE_REQUIREMENTS } from '@/data/creditCosts';

interface InsufficientCreditsState {
  open: boolean;
  requiredCredits: number;
  actionName: string;
}

interface UseCreditActionReturn {
  performAction: (actionType: string, callback: () => Promise<any>) => Promise<any>;
  checking: boolean;
  checkMinBalance: (actionType: string) => boolean;
  insufficientModal: InsufficientCreditsState;
  closeInsufficientModal: () => void;
}

export const useCreditAction = (): UseCreditActionReturn => {
  const { balance, refreshWallet } = useWallet();
  const [checking, setChecking] = useState(false);
  const [insufficientModal, setInsufficientModal] = useState<InsufficientCreditsState>({
    open: false,
    requiredCredits: 0,
    actionName: '',
  });

  const closeInsufficientModal = useCallback(() => {
    setInsufficientModal({ open: false, requiredCredits: 0, actionName: '' });
  }, []);

  const showInsufficientModal = (cost: number, actionType: string) => {
    const label = actionType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    setInsufficientModal({ open: true, requiredCredits: cost, actionName: label });
  };

  // Check if user meets minimum balance requirement (no deduction)
  const checkMinBalance = (actionType: string): boolean => {
    const minRequired = MIN_BALANCE_REQUIREMENTS[actionType];
    if (minRequired && balance < minRequired) {
      showInsufficientModal(minRequired, actionType);
      return false;
    }
    return true;
  };

  const performAction = async (actionType: string, callback: () => Promise<any>) => {
    const cost = CRM_ACTION_COSTS[actionType] ?? CRM_ACTION_COSTS['default_write'];

    // Check minimum balance requirements first
    const minRequired = MIN_BALANCE_REQUIREMENTS[actionType];
    if (minRequired && balance < minRequired) {
      showInsufficientModal(minRequired, actionType);
      return null;
    }

    // Free actions (including connect_social_account) pass through after min balance check
    if (cost === 0) {
      return await callback();
    }

    // Check client-side balance (fast fail) — show modal
    if (balance < cost) {
      showInsufficientModal(cost, actionType);
      return null;
    }

    setChecking(true);
    try {
      // Deduct credits server-side (secure)
      const { data: session } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('deduct-credits', {
        body: { action_type: actionType, cost },
        headers: {
          Authorization: `Bearer ${session?.session?.access_token}`,
        },
      });

      if (error || !data?.success) {
        const msg = data?.error || error?.message || 'Failed to deduct credits';
        if (msg.includes('Insufficient')) {
          showInsufficientModal(cost, actionType);
        } else {
          toast.error('Credit deduction failed', { description: msg });
        }
        return null;
      }

      // Execute the actual action
      const result = await callback();

      // Refresh wallet to reflect new balance
      await refreshWallet();

      return result;
    } catch (err: any) {
      toast.error('Action failed', { description: err.message });
      return null;
    } finally {
      setChecking(false);
    }
  };

  return { performAction, checking, checkMinBalance, insufficientModal, closeInsufficientModal };
};

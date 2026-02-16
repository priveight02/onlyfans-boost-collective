import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/hooks/useWallet';
import { toast } from 'sonner';

// Credit costs for CRM write actions
export const CRM_ACTION_COSTS: Record<string, number> = {
  // Account management
  'create_account': 5,
  'update_account': 2,
  'delete_account': 1,
  
  // Messaging
  'send_message': 1,
  'send_bulk_message': 10,
  
  // Tasks
  'create_task': 2,
  'update_task': 1,
  'complete_task': 0,
  
  // Contracts
  'create_contract': 5,
  'update_contract': 2,
  'sign_contract': 3,
  
  // Content
  'create_content': 3,
  'schedule_content': 2,
  'publish_content': 5,
  
  // Team
  'add_team_member': 5,
  'update_team_member': 2,
  'remove_team_member': 1,
  
  // Financial
  'create_financial_record': 3,
  'update_financial_record': 2,
  
  // Persona DNA
  'create_persona': 10,
  'update_persona': 5,
  
  // Storyline / Scripts
  'create_script': 5,
  'update_script': 3,
  'generate_script': 15,
  
  // AI Co-Pilot
  'copilot_query': 5,
  'copilot_generate_image': 10,
  'copilot_generate_video': 20,
  'copilot_voice': 8,
  
  // Social Media
  'create_social_post': 3,
  'schedule_social_post': 2,
  'auto_reply_setup': 5,
  
  // Profile Lookup
  'profile_lookup': 3,
  
  // Audience Intelligence
  'audience_analysis': 5,
  
  // Emotional Heatmap
  'emotional_analysis': 5,
  
  // Rankings
  'update_ranking': 2,
  
  // Reports
  'generate_report': 5,
  'export_report': 3,
  
  // Bio Links
  'create_bio_link': 3,
  'update_bio_link': 2,
  
  // Intranet Chat
  'send_intranet_message': 0,
  
  // Settings
  'update_settings': 0,

  // Keyword Delays
  'create_keyword_rule': 3,
  'update_keyword_rule': 2,

  // Generic fallback
  'default_write': 2,
};

interface UseCreditActionReturn {
  performAction: (actionType: string, callback: () => Promise<any>) => Promise<any>;
  checking: boolean;
}

export const useCreditAction = (): UseCreditActionReturn => {
  const { balance, refreshWallet } = useWallet();
  const [checking, setChecking] = useState(false);

  const performAction = async (actionType: string, callback: () => Promise<any>) => {
    const cost = CRM_ACTION_COSTS[actionType] ?? CRM_ACTION_COSTS['default_write'];

    // Free actions pass through
    if (cost === 0) {
      return await callback();
    }

    // Check client-side balance first (fast fail)
    if (balance < cost) {
      toast.error(`Insufficient credits`, {
        description: `This action costs ${cost} credits. You have ${balance}.`,
        action: {
          label: 'Buy Credits',
          onClick: () => window.location.href = '/pricing',
        },
      });
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
          toast.error('Insufficient credits', {
            description: `You need ${cost} credits for this action.`,
            action: {
              label: 'Buy Credits',
              onClick: () => window.location.href = '/pricing',
            },
          });
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

  return { performAction, checking };
};

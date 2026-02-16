import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/hooks/useWallet';
import { toast } from 'sonner';

// ─── Credit costs for CRM actions ───────────────────────────────────
// Based on plan tiers: Starter 215cr, Pro 1,075cr, Business 4,300cr
// Costs are set so a Pro user can perform ~100-200 actions/month comfortably
//
// Special rules:
// - connect_social_account: requires 10 credits minimum but costs 0
// - ai_auto_responder_hourly: charged per hour while active
// - All navigation requires ≥1 credit (enforced in CRM page)
// ─────────────────────────────────────────────────────────────────────

export const CRM_ACTION_COSTS: Record<string, number> = {
  // ── Account Management ──
  create_account: 5,
  update_account: 2,
  delete_account: 1,

  // ── Messaging ──
  send_message: 1,
  send_bulk_message: 15,

  // ── Tasks ──
  create_task: 2,
  update_task: 1,
  complete_task: 0,

  // ── Contracts ──
  create_contract: 8,
  update_contract: 3,
  sign_contract: 5,

  // ── Content Calendar ──
  create_content: 5,
  schedule_content: 3,
  publish_content: 5,

  // ── Team ──
  add_team_member: 10,
  update_team_member: 3,
  remove_team_member: 1,

  // ── Financial Records ──
  create_financial_record: 5,
  update_financial_record: 2,

  // ── Persona DNA ──
  create_persona: 15,
  update_persona: 8,

  // ── Storyline / Scripts ──
  create_script: 10,
  update_script: 5,
  generate_script: 25, // AI-heavy

  // ── AI Co-Pilot ──
  copilot_query: 8,          // each chat message
  copilot_generate_image: 15,
  copilot_generate_video: 30,
  copilot_voice: 12,

  // ── Social Media ──
  connect_social_account: 0, // free but requires min 10 balance (enforced separately)
  create_social_post: 5,
  schedule_social_post: 3,
  auto_reply_setup: 5,

  // ── AI Auto Responder ──
  ai_auto_responder_hourly: 5, // per hour when active
  ai_auto_responder_activate: 10, // one-time activation cost

  // ── Profile Lookup ──
  profile_lookup: 5,

  // ── Audience Intelligence ──
  audience_analysis: 8,

  // ── Emotional Heatmap ──
  emotional_analysis: 8,

  // ── Rankings ──
  update_ranking: 3,

  // ── Reports & Export ──
  generate_report: 8,
  export_report: 5,

  // ── Bio Links ──
  create_bio_link: 5,
  update_bio_link: 3,

  // ── Keyword Delays ──
  create_keyword_rule: 5,
  update_keyword_rule: 3,

  // ── Intranet Chat ──
  send_intranet_message: 0, // free internal comms

  // ── Settings ──
  update_settings: 0,

  // ── Fallback ──
  default_write: 3,
};

// Minimum balance requirements (action allowed but no deduction)
export const MIN_BALANCE_REQUIREMENTS: Record<string, number> = {
  connect_social_account: 10,
};

interface UseCreditActionReturn {
  performAction: (actionType: string, callback: () => Promise<any>) => Promise<any>;
  checking: boolean;
  checkMinBalance: (actionType: string) => boolean;
}

export const useCreditAction = (): UseCreditActionReturn => {
  const { balance, refreshWallet } = useWallet();
  const [checking, setChecking] = useState(false);

  // Check if user meets minimum balance requirement (no deduction)
  const checkMinBalance = (actionType: string): boolean => {
    const minRequired = MIN_BALANCE_REQUIREMENTS[actionType];
    if (minRequired && balance < minRequired) {
      toast.error(`Minimum balance required`, {
        description: `You need at least ${minRequired} credits to perform this action. You have ${balance}.`,
        action: {
          label: 'Buy Credits',
          onClick: () => window.location.href = '/pricing',
        },
      });
      return false;
    }
    return true;
  };

  const performAction = async (actionType: string, callback: () => Promise<any>) => {
    const cost = CRM_ACTION_COSTS[actionType] ?? CRM_ACTION_COSTS['default_write'];

    // Check minimum balance requirements first
    const minRequired = MIN_BALANCE_REQUIREMENTS[actionType];
    if (minRequired && balance < minRequired) {
      toast.error(`Minimum balance required`, {
        description: `You need at least ${minRequired} credits for this. You have ${balance}.`,
        action: {
          label: 'Buy Credits',
          onClick: () => window.location.href = '/pricing',
        },
      });
      return null;
    }

    // Free actions (including connect_social_account) pass through after min balance check
    if (cost === 0) {
      return await callback();
    }

    // Check client-side balance (fast fail)
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

  return { performAction, checking, checkMinBalance };
};

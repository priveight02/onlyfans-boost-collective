import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/hooks/useWallet';
import { toast } from 'sonner';

// ─── Credit costs for CRM actions ───────────────────────────────────
export const CRM_ACTION_COSTS: Record<string, number> = {
  create_account: 5,
  update_account: 2,
  delete_account: 1,
  send_message: 1,
  send_bulk_message: 15,
  create_task: 2,
  update_task: 1,
  complete_task: 0,
  create_contract: 8,
  update_contract: 3,
  sign_contract: 5,
  create_content: 5,
  schedule_content: 3,
  publish_content: 5,
  add_team_member: 10,
  update_team_member: 3,
  remove_team_member: 1,
  create_financial_record: 5,
  update_financial_record: 2,
  create_persona: 15,
  update_persona: 8,
  create_script: 10,
  update_script: 5,
  generate_script: 25,
  copilot_query: 8,
  copilot_generate_image: 15,
  copilot_generate_video: 30,
  copilot_voice: 12,
  connect_social_account: 0,
  create_social_post: 5,
  schedule_social_post: 3,
  auto_reply_setup: 5,
  ai_auto_responder_hourly: 5,
  ai_auto_responder_activate: 10,
  profile_lookup: 5,
  audience_analysis: 8,
  emotional_analysis: 8,
  create_emotional_profile: 5,
  update_emotional_profile: 3,
  update_ranking: 3,
  generate_report: 8,
  export_report: 5,
  create_bio_link: 5,
  update_bio_link: 3,
  create_keyword_rule: 5,
  update_keyword_rule: 3,
  delete_keyword_rule: 1,
  send_intranet_message: 0,
  create_chat_room: 2,
  update_settings: 0,
  default_write: 3,
};

export const ACTION_LABELS: Record<string, string> = {
  create_account: "Create Account",
  update_account: "Update Account",
  delete_account: "Delete Account",
  send_message: "Send Message",
  send_bulk_message: "Bulk Message",
  create_task: "Create Task",
  update_task: "Update Task",
  create_contract: "Create Contract",
  update_contract: "Update Contract",
  sign_contract: "Sign Contract",
  create_content: "Create Content",
  schedule_content: "Schedule Content",
  publish_content: "Publish Content",
  add_team_member: "Add Team Member",
  update_team_member: "Update Team Member",
  remove_team_member: "Remove Team Member",
  create_financial_record: "Create Financial Record",
  update_financial_record: "Update Financial Record",
  create_persona: "Create Persona",
  update_persona: "Update Persona",
  create_script: "Create Script",
  update_script: "Update Script",
  generate_script: "Generate Script (AI)",
  copilot_query: "AI Co-Pilot Chat",
  copilot_generate_image: "Generate Image",
  copilot_generate_video: "Generate Video",
  copilot_voice: "Generate Audio",
  create_social_post: "Create Social Post",
  schedule_social_post: "Schedule Post",
  auto_reply_setup: "Auto Reply Setup",
  ai_auto_responder_activate: "Activate Auto Responder",
  profile_lookup: "Profile Lookup",
  audience_analysis: "Audience Analysis",
  emotional_analysis: "Emotional Analysis",
  create_emotional_profile: "Create Emotional Profile",
  update_emotional_profile: "Update Emotional Profile",
  generate_report: "Generate Report",
  export_report: "Export Report",
  create_bio_link: "Create Bio Link",
  update_bio_link: "Update Bio Link",
  create_keyword_rule: "Create Keyword Rule",
  update_keyword_rule: "Update Keyword Rule",
  delete_keyword_rule: "Delete Keyword Rule",
  create_chat_room: "Create Chat Room",
  default_write: "Action",
};

export const MIN_BALANCE_REQUIREMENTS: Record<string, number> = {
  connect_social_account: 10,
};

// ─── Modal state context ──────────────────────────────────────────
interface CreditModalState {
  open: boolean;
  requiredCredits: number;
  actionName: string;
}

interface CreditModalContextValue {
  modalState: CreditModalState;
  showModal: (credits: number, action: string) => void;
  hideModal: () => void;
}

const CreditModalContext = createContext<CreditModalContextValue | null>(null);

export const useCreditModal = () => {
  const ctx = useContext(CreditModalContext);
  if (!ctx) throw new Error("useCreditModal must be inside CreditModalProvider");
  return ctx;
};

export const CreditModalProvider = ({ children }: { children: ReactNode }) => {
  const [modalState, setModalState] = useState<CreditModalState>({
    open: false,
    requiredCredits: 0,
    actionName: "",
  });

  const showModal = useCallback((credits: number, action: string) => {
    setModalState({ open: true, requiredCredits: credits, actionName: action });
  }, []);

  const hideModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, open: false }));
  }, []);

  return (
    <CreditModalContext.Provider value={{ modalState, showModal, hideModal }}>
      {children}
    </CreditModalContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────
interface UseCreditActionReturn {
  performAction: (actionType: string, callback: () => Promise<any>) => Promise<any>;
  checking: boolean;
  checkMinBalance: (actionType: string) => boolean;
}

export const useCreditAction = (): UseCreditActionReturn => {
  const { balance, refreshWallet } = useWallet();
  const [checking, setChecking] = useState(false);

  const modalCtx = useContext(CreditModalContext);
  const showModal = modalCtx?.showModal ?? null;

  const showInsufficientCredits = (cost: number, actionType: string) => {
    const label = ACTION_LABELS[actionType] || actionType;
    if (showModal) {
      showModal(cost, label);
    } else {
      toast.error('Insufficient credits', {
        description: `"${label}" costs ${cost} credits. You have ${balance}.`,
        action: {
          label: 'Buy Credits',
          onClick: () => { window.location.href = '/pricing'; },
        },
      });
    }
  };

  const checkMinBalance = (actionType: string): boolean => {
    const minRequired = MIN_BALANCE_REQUIREMENTS[actionType];
    if (minRequired && balance < minRequired) {
      const label = ACTION_LABELS[actionType] || actionType;
      if (showModal) {
        showModal(minRequired, label);
      } else {
        toast.error('Minimum balance required', {
          description: `You need at least ${minRequired} credits. You have ${balance}.`,
          action: {
            label: 'Buy Credits',
            onClick: () => { window.location.href = '/pricing'; },
          },
        });
      }
      return false;
    }
    return true;
  };

  const performAction = async (actionType: string, callback: () => Promise<any>) => {
    const cost = CRM_ACTION_COSTS[actionType] ?? CRM_ACTION_COSTS['default_write'];

    const minRequired = MIN_BALANCE_REQUIREMENTS[actionType];
    if (minRequired && balance < minRequired) {
      showInsufficientCredits(minRequired, actionType);
      return null;
    }

    if (cost === 0) {
      return await callback();
    }

    if (balance < cost) {
      showInsufficientCredits(cost, actionType);
      return null;
    }

    setChecking(true);
    try {
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
          showInsufficientCredits(cost, actionType);
        } else {
          toast.error('Credit deduction failed', { description: msg });
        }
        return null;
      }

      const result = await callback();
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

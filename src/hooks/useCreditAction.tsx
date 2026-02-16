import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/hooks/useWallet';
import { toast } from 'sonner';

// ─── Credit costs for CRM actions ───────────────────────────────────
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
  generate_script: 25,
  // ── AI Co-Pilot ──
  copilot_query: 8,
  copilot_generate_image: 15,
  copilot_generate_video: 30,
  copilot_voice: 12,
  // ── Social Media ──
  connect_social_account: 0,
  create_social_post: 5,
  schedule_social_post: 3,
  auto_reply_setup: 5,
  // ── AI Auto Responder ──
  ai_auto_responder_hourly: 5,
  ai_auto_responder_activate: 10,
  // ── Profile Lookup ──
  profile_lookup: 5,
  // ── Audience Intelligence ──
  audience_analysis: 8,
  // ── Emotional Heatmap ──
  emotional_analysis: 8,
  create_emotional_profile: 5,
  update_emotional_profile: 3,
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
  delete_keyword_rule: 1,
  // ── Intranet Chat ──
  send_intranet_message: 0,
  create_chat_room: 2,
  // ── Settings ──
  update_settings: 0,
  // ── Fallback ──
  default_write: 3,
};

// Human-readable labels for action types
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

// Minimum balance requirements (action allowed but no deduction)
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
  
  // Try to use modal context (may not be available in all contexts)
  const modalCtx = useContext(CreditModalContext);
  const showModal = modalCtx?.showModal ?? null;

  const showInsufficientCredits = (cost: number, actionType: string) => {
    const label = ACTION_LABELS[actionType] || actionType;
    if (showModal) {
      showModal(cost, label);
    } else {
      toast.error(`Insufficient credits`, {
        description: `"${label}" costs ${cost} credits. You have ${balance}.`,
        action: {
          label: 'Buy Credits',
          onClick: () => window.location.href = '/pricing',
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
        toast.error(`Minimum balance required`, {
          description: `You need at least ${minRequired} credits. You have ${balance}.`,
          action: {
            label: 'Buy Credits',
            onClick: () => window.location.href = '/pricing',
          },
        });
      }
      return false;
    }
    return true;
  };

  const performAction = async (actionType: string, callback: () => Promise<any>) => {
    const cost = CRM_ACTION_COSTS[actionType] ?? CRM_ACTION_COSTS['default_write'];

    // Check minimum balance requirements first
    const minRequired = MIN_BALANCE_REQUIREMENTS[actionType];
    if (minRequired && balance < minRequired) {
      showInsufficientCredits(minRequired, actionType);
      return null;
    }

    // Free actions pass through after min balance check
    if (cost === 0) {
      return await callback();
    }

    // Check client-side balance (fast fail)
    if (balance < cost) {
      showInsufficientCredits(cost, actionType);
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
          showInsufficientCredits(cost, actionType);
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


-- Admin notifications sent to users (popup on their screen)
CREATE TABLE public.admin_user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'info', -- info, warning, urgent, success
  is_read BOOLEAN NOT NULL DEFAULT false,
  sent_by UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

ALTER TABLE public.admin_user_notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications"
  ON public.admin_user_notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own as read
CREATE POLICY "Users can update own notifications"
  ON public.admin_user_notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can insert notifications
CREATE POLICY "Admins can insert notifications"
  ON public.admin_user_notifications FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Admins can read all notifications
CREATE POLICY "Admins can read all notifications"
  ON public.admin_user_notifications FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Enable realtime for instant popup
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_user_notifications;

-- Admin action log
CREATE TABLE public.admin_user_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- pause, unpause, suspend, delete, warn, grant_credits, revoke_credits, reset_password, send_notification
  performed_by UUID NOT NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_user_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage actions"
  ON public.admin_user_actions FOR ALL
  USING (public.is_admin(auth.uid()));

-- Add account_status to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_notes TEXT;

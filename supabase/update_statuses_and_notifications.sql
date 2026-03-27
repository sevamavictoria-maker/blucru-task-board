-- ============================================================
-- Update task board: new statuses, file links, notifications
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Add file_links and sequence to tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS file_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sequence integer;

-- 2. Add status and sop_template_id to projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS sop_template_id uuid REFERENCES sop_templates ON DELETE SET NULL;

-- 3. Update existing 'inbox' status to 'new'
UPDATE public.tasks SET status = 'new' WHERE status = 'inbox';

-- 4. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  task_id    uuid REFERENCES tasks ON DELETE CASCADE,
  type       text NOT NULL,
  message    text NOT NULL,
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id, read);

-- 5. RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

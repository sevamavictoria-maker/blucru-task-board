-- ============================================================
-- Add SOP template subtasks + recurring projects
-- Run this in the Supabase SQL Editor
-- ============================================================

-- SOP template subtasks
CREATE TABLE IF NOT EXISTS public.sop_template_subtasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_task_id uuid NOT NULL REFERENCES sop_template_tasks ON DELETE CASCADE,
  title       text NOT NULL,
  sequence    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sop_template_subtasks_task ON public.sop_template_subtasks (sop_task_id);

ALTER TABLE public.sop_template_subtasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read sop template subtasks" ON public.sop_template_subtasks FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert sop template subtasks" ON public.sop_template_subtasks FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can update sop template subtasks" ON public.sop_template_subtasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can delete sop template subtasks" ON public.sop_template_subtasks FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Recurring project fields
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS recurring_frequency text,
  ADD COLUMN IF NOT EXISTS recurring_auto_create boolean NOT NULL DEFAULT false;

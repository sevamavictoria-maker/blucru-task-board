-- ============================================================
-- Rename duration_days to duration_hours
-- Values are now in hours (1 day = 8 hours)
-- Run this in the Supabase SQL Editor
-- ============================================================

ALTER TABLE public.sop_template_tasks
  RENAME COLUMN duration_days TO duration_hours;

-- Convert existing day values to hours (multiply by 8)
UPDATE public.sop_template_tasks
  SET duration_hours = duration_hours * 8
  WHERE duration_hours IS NOT NULL;

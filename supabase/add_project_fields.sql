-- Add created_by, start_date, end_date, archived to projects
-- Run this in the Supabase SQL Editor

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_projects_archived ON public.projects (archived);

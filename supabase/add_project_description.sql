-- Add description to projects
-- Run this in the Supabase SQL Editor

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS description text;

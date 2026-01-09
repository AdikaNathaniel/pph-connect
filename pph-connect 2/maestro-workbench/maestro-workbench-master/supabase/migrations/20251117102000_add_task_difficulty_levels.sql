-- Migration: Add Task Difficulty Levels
-- Created: 2025-11-17
-- Purpose: Introduce task difficulty taxonomy aligned with worker tier progression.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'task_difficulty_level'
  ) THEN
    CREATE TYPE public.task_difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
  END IF;
END
$$;

ALTER TABLE public.task_templates
  ADD COLUMN IF NOT EXISTS difficulty_level public.task_difficulty_level NOT NULL DEFAULT 'beginner';

UPDATE public.task_templates
  SET difficulty_level = 'advanced'
  WHERE modality IN ('audio-long', 'video');

UPDATE public.task_templates
  SET difficulty_level = 'intermediate'
  WHERE modality IN ('text', 'image', 'audio-short')
    AND difficulty_level = 'beginner';

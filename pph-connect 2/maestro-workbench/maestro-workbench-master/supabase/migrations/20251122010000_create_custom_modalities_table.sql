-- Migration: Create Custom Modalities Table
-- Created: 2025-11-22
-- Purpose: Allow admins to define reusable modality templates.

CREATE TABLE IF NOT EXISTS public.custom_modalities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  modality_key text NOT NULL,
  description text,
  modality_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  column_config jsonb NOT NULL DEFAULT '[]'::jsonb,
  annotation_tools jsonb NOT NULL DEFAULT '[]'::jsonb,
  validation_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_modalities_creator
  ON public.custom_modalities(created_by);

ALTER TABLE public.custom_modalities
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage custom modalities"
  ON public.custom_modalities
  FOR ALL
  TO authenticated
  USING (public.worker_has_role(auth.uid(), ARRAY['root','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['root','admin']));

CREATE POLICY "Creators can view their custom modalities"
  ON public.custom_modalities
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid() OR public.worker_has_role(auth.uid(), ARRAY['root','admin']));

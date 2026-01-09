-- Migration: Create Invoices Table
-- Created: 2025-11-17
-- Purpose: Store worker earnings statements for invoicing workflows.

-- Create invoice_status enum (safe version with existence check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE public.invoice_status AS ENUM ('draft', 'submitted', 'approved', 'paid');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'USD',
  status invoice_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz DEFAULT NULL,
  approved_by uuid REFERENCES public.profiles(id),
  notes text DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoices_worker
  ON public.invoices(worker_id);

CREATE INDEX IF NOT EXISTS idx_invoices_status
  ON public.invoices(status);

ALTER TABLE public.invoices
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read invoices"
  ON public.invoices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage invoices"
  ON public.invoices
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('root', 'super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('root', 'super_admin', 'admin')
    )
  );

-- Migration: Create Invoice Adjustments Table
-- Created: 2025-11-17
-- Purpose: Track invoice bonuses and deductions.

CREATE TABLE IF NOT EXISTS public.invoice_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('bonus', 'deduction')),
  amount numeric NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_adjustments_invoice
  ON public.invoice_adjustments(invoice_id);

ALTER TABLE public.invoice_adjustments
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read invoice adjustments"
  ON public.invoice_adjustments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage invoice adjustments"
  ON public.invoice_adjustments
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

-- Migration: Create Invoice Line Items Table
-- Created: 2025-11-17
-- Purpose: Track project-level earnings per invoice.

CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id),
  worker_account_id uuid REFERENCES public.worker_accounts(id),
  units numeric DEFAULT 0,
  hours numeric DEFAULT 0,
  rate numeric DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice
  ON public.invoice_line_items(invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_project
  ON public.invoice_line_items(project_id);

ALTER TABLE public.invoice_line_items
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read invoice line items"
  ON public.invoice_line_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage invoice line items"
  ON public.invoice_line_items
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

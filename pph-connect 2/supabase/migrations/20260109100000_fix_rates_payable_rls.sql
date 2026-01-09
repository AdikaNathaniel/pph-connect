-- ============================================================================
-- Migration: Fix Rates Payable RLS Policy
-- ============================================================================
-- Created: 2026-01-09
-- Purpose: Update RLS policy to allow managers to manage rate cards
-- ============================================================================

-- Drop the existing admin-only policy
DROP POLICY IF EXISTS "rates_payable_admin_manage_policy" ON public.rates_payable;

-- Create new policy allowing root, admin, and manager roles to manage rate cards
CREATE POLICY "rates_payable_manage_policy"
    ON public.rates_payable
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('root', 'admin', 'manager')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('root', 'admin', 'manager')
        )
    );

-- Add comment explaining the policy
COMMENT ON POLICY "rates_payable_manage_policy" ON public.rates_payable
    IS 'Allow root, admin, and manager users to insert, update, and delete rate cards';
